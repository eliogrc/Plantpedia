#!/usr/bin/env python3
"""Manual deploy of Plantpedia to the existing Cloud Run service.

    python3 scripts/deploy-gcp.py

What it does:
  1. Packs the project (no .git, node_modules, .next or .env* files) and adds a
     generated .env.production with only the NEXT_PUBLIC_* values from .env.local.
     Next inlines those at build time, so a build without them produces a broken site.
     The values are never printed and never written to disk.
  2. Builds the Dockerfile in Cloud Build and pushes the image to Artifact Registry.
  3. Points the Cloud Run service at the new image. Everything else on the service
     (env vars, scaling, access) stays as it is.

Needs `gcloud` logged in with access to the project, and the service to exist already.
Only the Python standard library is used. It goes through the REST APIs because the
gcloud on this machine is the Windows one, which cannot read WSL paths.
"""
import io
import json
import os
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.request
from pathlib import Path

PROJECT = 'project-91e4b263-f7b3-419f-943'
PROJECT_NUMBER = '867549891004'
REGION = 'us-central1'
SERVICE = 'plantpedia'
BUCKET = f'{PROJECT}_cloudbuild'
REPO = f'{REGION}-docker.pkg.dev/{PROJECT}/cloud-run-source-deploy'
ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {'.git', 'node_modules', '.next', 'scripts', '.github'}


def log(message):
    print(time.strftime('%H:%M:%S'), message, flush=True)


def token():
    env_token = os.environ.get('GCLOUD_ACCESS_TOKEN', '').strip()
    if env_token:
        return env_token
    out = subprocess.run(['gcloud', 'auth', 'print-access-token'], capture_output=True, text=True).stdout.strip()
    if not out:
        sys.exit('Could not get an access token: run `gcloud auth login` first.')
    return out


TOKEN = token()


def call(url, method='GET', body=None, raw=None, content_type='application/json'):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    request = urllib.request.Request(url, data=data, method=method, headers={
        'Authorization': f'Bearer {TOKEN}', 'x-goog-user-project': PROJECT, 'Content-Type': content_type})
    try:
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read() or b'{}')
    except urllib.error.HTTPError as error:
        sys.exit(f'{method} {url.split("?")[0]} failed: {error.code} {error.read().decode()[:600]}')


def public_env():
    values = {}
    for line in (ROOT / '.env.local').read_text().splitlines():
        key, sep, value = line.partition('=')
        key = key.strip()
        if sep and key.startswith('NEXT_PUBLIC_'):
            values[key] = value.strip().strip('"\'')
    if not values:
        sys.exit('No NEXT_PUBLIC_* values found in .env.local.')
    log('public build variables: ' + ', '.join(sorted(values)))
    return values


def pack(env):
    buffer = io.BytesIO()
    count = 0
    with tarfile.open(fileobj=buffer, mode='w:gz') as archive:
        for folder, dirs, files in os.walk(ROOT):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for name in files:
                if name.startswith('.env'):
                    continue
                path = Path(folder) / name
                archive.add(path, arcname=path.relative_to(ROOT).as_posix())
                count += 1
        content = ''.join(f'{key}={value}\n' for key, value in env.items()).encode()
        info = tarfile.TarInfo('.env.production')
        info.size = len(content)
        info.mtime = int(time.time())
        archive.addfile(info, io.BytesIO(content))
    log(f'source archive: {count + 1} files, {buffer.tell() / 1e6:.1f} MB')
    return buffer.getvalue()


def main():
    tag = time.strftime('%Y%m%d-%H%M%S')
    image = f'{REPO}/{SERVICE}:{tag}'
    service_url = f'https://run.googleapis.com/v2/projects/{PROJECT}/locations/{REGION}/services/{SERVICE}'

    service = call(service_url)
    previous = service.get('latestReadyRevision', '')
    log(f'service found, serving revision {previous.split("/")[-1]}')

    archive = pack(public_env())
    source = f'source/{SERVICE}-{tag}.tgz'
    quoted = source.replace('/', '%2F')
    call(f'https://storage.googleapis.com/upload/storage/v1/b/{BUCKET}/o?uploadType=media&name={quoted}',
         'POST', raw=archive, content_type='application/gzip')
    log('source uploaded')

    try:
        build = call(f'https://cloudbuild.googleapis.com/v1/projects/{PROJECT}/builds', 'POST', {
            'source': {'storageSource': {'bucket': BUCKET, 'object': source}},
            'steps': [{'name': 'gcr.io/cloud-builders/docker', 'args': ['build', '-t', image, '.']}],
            'images': [image],
            'serviceAccount': f'projects/{PROJECT}/serviceAccounts/{PROJECT_NUMBER}-compute@developer.gserviceaccount.com',
            'options': {'logging': 'CLOUD_LOGGING_ONLY'},
            'timeout': '1200s',
        })['metadata']['build']
        log(f'build started: {build["id"]}')
        while True:
            time.sleep(15)
            status = call(f'https://cloudbuild.googleapis.com/v1/projects/{PROJECT}/builds/{build["id"]}')
            if status['status'] not in ('QUEUED', 'WORKING', 'PENDING'):
                break
        log(f'build {status["status"]}')
        if status['status'] != 'SUCCESS':
            sys.exit(f'Build failed, logs: {status.get("logUrl")}')
    finally:
        call(f'https://storage.googleapis.com/storage/v1/b/{BUCKET}/o/{quoted}', 'DELETE')

    template = service['template']
    template['containers'][0]['image'] = image
    # Enforce strict cost-cap scaling on every deploy
    scaling = template.setdefault('scaling', {})
    scaling['minInstanceCount'] = 0
    scaling['maxInstanceCount'] = 1

    # Migrate legacy NEXT_PUBLIC_PREVIEW_* env vars to server-only names
    env_renames = {
        'NEXT_PUBLIC_PREVIEW_SECRET': 'PREVIEW_SECRET',
        'NEXT_PUBLIC_PREVIEW_ACCESS_TOKEN': 'CONTENTFUL_PREVIEW_ACCESS_TOKEN',
    }
    env_list = template['containers'][0].get('env', [])
    existing_names = {entry.get('name') for entry in env_list}
    migrated_env = []
    for entry in env_list:
        name = entry.get('name')
        if name in env_renames:
            new_name = env_renames[name]
            if new_name not in existing_names:
                renamed = dict(entry)
                renamed['name'] = new_name
                migrated_env.append(renamed)
                existing_names.add(new_name)
                log(f'migrated Cloud Run env var {name} -> {new_name}')
        else:
            migrated_env.append(entry)
    template['containers'][0]['env'] = migrated_env

    call(f'{service_url}?updateMask=template,defaultUriDisabled', 'PATCH', {
        'template': template,
        'defaultUriDisabled': True,
    })
    log('new revision requested')
    for _ in range(60):
        time.sleep(10)
        service = call(service_url)
        state = service.get('terminalCondition', {})
        if state.get('state') == 'CONDITION_FAILED':
            sys.exit(f'Deploy failed: {state.get("message")}')
        if not service.get('reconciling') and state.get('state') == 'CONDITION_SUCCEEDED' \
                and service.get('latestReadyRevision') != previous:
            log(f'serving revision {service["latestReadyRevision"].split("/")[-1]}')
            print('URL', service.get('uri', '(default *.run.app URL disabled)'))
            return
    sys.exit('Timed out waiting for the new revision.')


if __name__ == '__main__':
    main()
