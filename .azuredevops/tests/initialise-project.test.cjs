// Offline initializer regressions. Git pushes go ONLY to disposable local bare repos.
// Optional: TAXI_TEMPLATE_ROOT runs the generated taxi suite; TAXI_TEST_PYTHON adds Python tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { after, test } = require('node:test');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '../..');
const scripts = path.join(root, '.azuredevops/scripts');
const initializer = path.join(scripts, 'initialise_repo.sh');
const creator = path.join(scripts, 'create_ado_pipelines.sh');
const windows = process.platform === 'win32';
const bash = windows ? path.join(process.env.ProgramFiles || 'C:/Program Files', 'Git/bin/bash.exe') : 'bash';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'taxi-initializer-test-'));
after(() => fs.rmSync(temp, { recursive: true, force: true }));
const posix = value => value.replace(/\\/g, '/');
const environment = { ...process.env };
for (const key of Object.keys(environment)) {
  if (/^(?:AZURE|ARM_|GITHUB|GH_|GIT_|SYSTEM_ACCESSTOKEN|SYSTEM_COLLECTIONURI|BASH_ENV$|ENV$)/i.test(key)) delete environment[key];
}
Object.assign(environment, {
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: posix(path.join(temp, 'global-gitconfig')),
  GIT_CONFIG_COUNT: '2',
  GIT_CONFIG_KEY_0: 'protocol.allow', GIT_CONFIG_VALUE_0: 'never',
  GIT_CONFIG_KEY_1: 'protocol.file.allow', GIT_CONFIG_VALUE_1: 'always',
  GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0',
  PYTHONDONTWRITEBYTECODE: '1',
});

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: temp, env: environment, encoding: 'utf8', timeout: 30000, ...options,
  });
  assert.ifError(result.error);
  return result;
}

function ok(result) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function git(directory, ...args) {
  return ok(run('git', ['-C', directory, ...args]));
}

function write(directory, relative, content) {
  const file = path.join(directory, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function fingerprint(directory, omitGit = false) {
  const entries = {};
  function visit(current, prefix = '') {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (omitGit && !prefix && entry.name === '.git') continue;
      const relative = prefix + entry.name;
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) visit(file, relative + '/');
      else entries[relative] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    }
  }
  visit(directory);
  return entries;
}

function fixture({ standalone = true, project = 'classical', version = 'aml-cli-v2', infrastructure = 'bicep', initialCommit = true } = {}) {
  const base = fs.mkdtempSync(path.join(temp, 'fixture with spaces-'));
  const source = path.join(base, 'template');
  const target = path.join(base, 'new project');
  const remote = path.join(base, 'origin.git');
  fs.mkdirSync(source);
  fs.mkdirSync(target);
  ok(run('git', ['init', '--bare', '--initial-branch=main', remote]));
  git(target, 'init', '--initial-branch=main');
  git(target, 'remote', 'add', 'origin', remote);
  if (initialCommit) {
    write(target, 'README.md', '# Empty target\n');
    git(target, 'add', '.');
    git(target, '-c', 'user.email=test@example.invalid', '-c', 'user.name=Fixture', 'commit', '-m', 'Empty target');
    git(target, 'push', 'origin', 'main');
  }
  const prefix = standalone ? '' : `${project}/${version}/`;
  write(source, 'config-infra-dev.yml', 'variables:\n  environment: dev\n');
  write(source, 'config-infra-prod.yml', 'variables:\n  environment: prod\n');
  write(source, `${prefix}data/example.csv`, 'x,cost\n1,2\n');
  write(source, `${prefix}data-science/src/train.py`, '# Fixture training\n');
  write(source, `${prefix}mlops/devops-pipelines/train.yml`, 'trigger: none\n');
  write(source, `${prefix}mlops/devops-pipelines/templates/require-success.yml`, 'steps: []\n');
  const infraPrefix = standalone ? 'infrastructure/' : `infrastructure/${infrastructure}/`;
  write(source, `${infraPrefix}pipelines/deploy.yml`, 'trigger: none\n');
  if (standalone) {
    write(source, 'template-manifest.json', '{"layout":"standalone"}\n');
    write(source, 'tests/regression.txt', 'Preserve tests\n');
    write(source, 'docs/setup.md', 'Preserve docs\n');
    write(source, '.gitignore', '.venv/\n');
    write(source, '.gitattributes', '* text=auto eol=lf\n');
    write(source, '.git/source-only-marker', 'Do not copy Git metadata\n');
  } else {
    write(source, `${prefix}mlops/github-actions/unused.yml`, 'name: unused\n');
    if (version === 'python-sdk-v2') write(source, `${prefix}config-aml.yml`, 'workspace: example\n');
  }
  return { base, source, target, remote, project, version, infrastructure, layout: standalone ? 'standalone' : 'accelerator' };
}

function initialize(f, overrides = {}) {
  const values = { ...f, ...overrides };
  return run(bash, ['--noprofile', '--norc', posix(initializer), posix(values.target), values.project,
    values.version, posix(values.source), values.infrastructure, values.layout]);
}

test('both shell scripts have valid Bash syntax', () => {
  for (const script of [initializer, creator]) ok(run(bash, ['--noprofile', '--norc', '-n', posix(script)]));
});

test('taxi run form exposes only the three relevant repository inputs', () => {
  const yaml = fs.readFileSync(path.join(root, '.azuredevops/initialise-project.yml'), 'utf8');
  const names = [...yaml.matchAll(/^  - name: (\w+)\s*$/gm)].map(match => match[1]);
  assert.deepEqual(names, ['adoProjectName', 'repoName', 'taxiTemplateRepoName']);
  assert.match(yaml, /name: taxiTemplateRepoName[\s\S]*?default: taxi-fare-regression-template/);
  assert.doesNotMatch(yaml, /useRepairedTaxiTemplate|mlOpsProjectRepoName|other scenarios|parameters\.(?:projectType|mlopsVersion|infrastructure_version)/i);
});

test('taxi initializer always selects the repaired standalone CLI v2 Bicep project', () => {
  const yaml = fs.readFileSync(path.join(root, '.azuredevops/initialise-project.yml'), 'utf8');
  assert.ok(yaml.includes('checkout: git://${{ parameters.adoProjectName }}/${{ parameters.taxiTemplateRepoName }}@refs/heads/main'));
  for (const [key, value] of [['PROJECT_TYPE', 'classical'], ['MLOPS_VERSION', 'aml-cli-v2'], ['INFRASTRUCTURE_VERSION', 'bicep'], ['TEMPLATE_LAYOUT', 'standalone']]) {
    assert.match(yaml, new RegExp(`^              ${key}: ${value}\\s*$`, 'm'));
  }
  assert.doesNotMatch(yaml, /\$\{\{\s*(?:if|else)\b|mlops-project-template/);
  assert.ok(yaml.includes('https://github.com/alvinea28/taxi-fare-regression'));
});

test('advanced upstream scenarios have a separate form with no unused taxi inputs', () => {
  const yaml = fs.readFileSync(path.join(root, '.azuredevops/initialise-project-advanced.yml'), 'utf8');
  const names = [...yaml.matchAll(/^  - name: (\w+)\s*$/gm)].map(match => match[1]);
  assert.deepEqual(names, ['adoProjectName', 'repoName', 'mlOpsProjectRepoName', 'projectType', 'mlopsVersion', 'infrastructure_version']);
  assert.doesNotMatch(yaml, /taxiTemplateRepoName|useRepairedTaxiTemplate/);
  assert.ok(yaml.includes('checkout: git://${{ parameters.adoProjectName }}/${{ parameters.mlOpsProjectRepoName }}@refs/heads/main'));
  assert.match(yaml, /^              TEMPLATE_LAYOUT: accelerator\s*$/m);
  for (const [key, value] of [['PROJECT_TYPE', 'projectType'], ['MLOPS_VERSION', 'mlopsVersion'], ['INFRASTRUCTURE_VERSION', 'infrastructure_version']]) {
    assert.ok(yaml.includes(`${key}: \${{ parameters.${value} }}`));
  }
});

for (const name of ['initialise-project.yml', 'initialise-project-advanced.yml']) {
  test(`${name}: checkout safety and environment-bound arguments are preserved`, () => {
    const yaml = fs.readFileSync(path.join(root, '.azuredevops', name), 'utf8');
    assert.match(yaml, /^trigger: none\s*$/m);
    for (const directory of ['accelerator', 'project-template', 'target']) assert.ok(yaml.includes(`path: s/${directory}`));
    assert.match(yaml, /path: s\/target\s+fetchDepth: 0\s+persistCredentials: true/);
    assert.equal([...yaml.matchAll(/persistCredentials: false/g)].length, 2);
    assert.equal([...yaml.matchAll(/persistCredentials: true/g)].length, 1);
    assert.ok(yaml.includes('"$TARGET_DIRECTORY" "$PROJECT_TYPE" "$MLOPS_VERSION"'));
    assert.ok(yaml.includes('"$TEMPLATE_DIRECTORY" "$INFRASTRUCTURE_VERSION" "$TEMPLATE_LAYOUT"'));
    assert.ok(yaml.includes('"$TARGET_REPOSITORY" "$ADO_PROJECT" "$TARGET_DIRECTORY"'));
    assert.doesNotMatch(yaml, /project-overrides|filePath:.*parameters\.mlopsRepoName/);
  });
}

for (const [name, options] of [
  ['initialise-project.yml', { standalone: true }],
  ['initialise-project-advanced.yml', { standalone: false, project: 'cv', version: 'aml-cli-v2', infrastructure: 'terraform' }],
]) {
  test(`${name}: its actual YAML wrapper generates the selected project`, () => {
    const f = fixture(options);
    const before = fingerprint(f.source);
    const yaml = fs.readFileSync(path.join(root, '.azuredevops', name), 'utf8');
    const block = yaml.match(/^              script: \|\r?\n((?:                [^\r\n]*(?:\r?\n|$))+)/m);
    assert.ok(block, 'Missing initialization task script.');
    const script = block[1].replace(/^                /gm, '').replace(/\r\n/g, '\n');
    const parameters = { projectType: f.project, mlopsVersion: f.version, infrastructure_version: f.infrastructure };
    const env = { ...environment, ACCELERATOR_ROOT: posix(root), TARGET_DIRECTORY: posix(f.target), TEMPLATE_DIRECTORY: posix(f.source) };
    for (const key of ['PROJECT_TYPE', 'MLOPS_VERSION', 'INFRASTRUCTURE_VERSION', 'TEMPLATE_LAYOUT']) {
      const value = yaml.match(new RegExp(`^              ${key}: ([^\\r\\n]+)`, 'm'))?.[1].trim();
      assert.ok(value, `Missing task environment value: ${key}`);
      const parameter = value.match(/^\$\{\{ parameters\.(\w+) \}\}$/)?.[1];
      env[key] = parameter ? parameters[parameter] : value;
      assert.equal(typeof env[key], 'string');
    }
    ok(run(bash, ['--noprofile', '--norc', '-s'], { input: script, env }));
    assert.ok(fs.existsSync(path.join(f.target, 'data-science/src/train.py')));
    assert.ok(fs.existsSync(path.join(f.target, 'infrastructure/pipelines/deploy.yml')));
    assert.equal(fs.existsSync(path.join(f.target, 'template-manifest.json')), options.standalone);
    assert.deepEqual(fingerprint(f.source), before);
    assert.equal(git(f.remote, 'rev-parse', 'refs/heads/main'), git(f.target, 'rev-parse', 'HEAD'));
  });
}

test('standalone generation copies hidden files, fixes, docs and tests, but not source Git metadata', () => {
  const f = fixture();
  const before = fingerprint(f.source);
  ok(initialize(f));
  assert.deepEqual(fingerprint(f.source), before, 'Template must remain byte-for-byte untouched.');
  assert.deepEqual(fingerprint(f.target, true), fingerprint(f.source, true));
  assert.equal(fs.existsSync(path.join(f.target, '.git/source-only-marker')), false);
  assert.equal(git(f.target, 'branch', '--show-current'), 'main');
  assert.equal(git(f.target, 'status', '--porcelain'), '');
  assert.equal(git(f.remote, 'rev-parse', 'refs/heads/main'), git(f.target, 'rev-parse', 'HEAD'));
  assert.equal(fs.existsSync(environment.GIT_CONFIG_GLOBAL), false, 'No global Git configuration writes.');
});

test('detached initial main checkout is supported', () => {
  const f = fixture();
  git(f.target, 'checkout', '--detach');
  ok(initialize(f));
  assert.equal(git(f.target, 'branch', '--show-current'), 'main');
});

test('empty repositories without an initial commit are supported', () => {
  const f = fixture({ initialCommit: false });
  ok(initialize(f));
  assert.equal(git(f.target, 'rev-list', '--count', 'HEAD'), '1');
});

test('a second initialization refuses the generated project without changes', () => {
  const f = fixture();
  ok(initialize(f));
  const before = fingerprint(f.target);
  const result = initialize(f);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Target already contains/);
  assert.deepEqual(fingerprint(f.target), before);
});

test('uncommitted target changes are preserved and rejected', () => {
  const f = fixture();
  write(f.target, 'README.md', 'Uncommitted work\n');
  const before = fingerprint(f.target);
  assert.match(initialize(f).stderr, /uncommitted changes/);
  assert.deepEqual(fingerprint(f.target), before);
});

test('previously used targets are rejected even if only a README remains', () => {
  const f = fixture();
  write(f.target, 'README.md', 'Second revision\n');
  git(f.target, 'add', '.');
  git(f.target, '-c', 'user.email=test@example.invalid', '-c', 'user.name=Fixture', 'commit', '-m', 'Existing work');
  const before = fingerprint(f.target);
  assert.match(initialize(f).stderr, /existing history/);
  assert.deepEqual(fingerprint(f.target), before);
});

test('source and target overlap is rejected before mutation', () => {
  const f = fixture();
  const before = fingerprint(f.source);
  const result = initialize(f, { target: f.source });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /separate, non-nested/);
  assert.deepEqual(fingerprint(f.source), before);
});

test('shallow history cannot disguise a previously used target as a new repository', () => {
  const f = fixture();
  write(f.target, 'README.md', 'Second committed revision\n');
  git(f.target, 'add', '.');
  git(f.target, '-c', 'user.email=test@example.invalid', '-c', 'user.name=Fixture', 'commit', '-m', 'Existing work');
  git(f.target, 'push', 'origin', 'main');
  const shallow = path.join(f.base, 'shallow target');
  ok(run('git', ['clone', '--depth=1', '--branch=main', pathToFileURL(f.remote).href, shallow]));
  assert.equal(git(shallow, 'rev-parse', '--is-shallow-repository'), 'true');
  assert.equal(git(shallow, 'rev-list', '--count', 'HEAD'), '1');
  const before = fingerprint(shallow);
  const remoteBefore = git(f.remote, 'rev-parse', 'refs/heads/main');
  const result = initialize(f, { target: shallow });
  assert.notEqual(result.status, 0, 'A shallow target must be refused, not overwritten.');
  assert.match(result.stderr, /shallow/);
  assert.deepEqual(fingerprint(shallow), before);
  assert.equal(git(f.remote, 'rev-parse', 'refs/heads/main'), remoteBefore);
});

test('missing standalone inputs fail before changing the target', () => {
  for (const missing of ['template-manifest.json', 'tests', 'config-infra-prod.yml']) {
    const f = fixture();
    fs.rmSync(path.join(f.source, missing), { recursive: true, force: true });
    const before = fingerprint(f.target);
    assert.notEqual(initialize(f).status, 0, missing);
    assert.deepEqual(fingerprint(f.target), before);
  }
});

test('standalone selection cannot be used for other project variants', () => {
  const f = fixture();
  const before = fingerprint(f.target);
  for (const overrides of [{ project: 'cv' }, { version: 'python-sdk-v2' }, { infrastructure: 'terraform' }, { layout: 'unknown' }]) {
    assert.notEqual(initialize(f, overrides).status, 0);
  }
  assert.deepEqual(fingerprint(f.target), before);
});

for (const options of [
  { project: 'classical', version: 'aml-cli-v2', infrastructure: 'bicep' },
  { project: 'cv', version: 'aml-cli-v2', infrastructure: 'terraform' },
  { project: 'nlp', version: 'python-sdk-v2', infrastructure: 'bicep' },
]) {
  test(`upstream layout remains supported: ${options.project}/${options.version}/${options.infrastructure}`, () => {
    const f = fixture({ standalone: false, ...options });
    const before = fingerprint(f.source);
    ok(initialize(f));
    assert.deepEqual(fingerprint(f.source), before);
    for (const file of ['data/example.csv', 'data-science/src/train.py', 'mlops/devops-pipelines/train.yml', 'infrastructure/pipelines/deploy.yml']) {
      assert.ok(fs.existsSync(path.join(f.target, file)), file);
    }
    assert.equal(fs.existsSync(path.join(f.target, 'mlops/github-actions')), false);
    if (options.version === 'python-sdk-v2') assert.ok(fs.existsSync(path.join(f.target, 'config-aml.yml')));
  });
}

function pipelineFixture(mode = '') {
  const f = fixture();
  ok(initialize(f));
  write(f.target, 'mlops/devops-pipelines/online.yaml', 'trigger: none\n');
  write(f.target, 'mlops/devops-pipelines/batch.yml', 'trigger: none\n');
  write(f.target, 'mlops/devops-pipelines/notes.txt', 'not a pipeline\n');
  const stub = path.join(f.base, 'fake-az.sh');
  const calls = path.join(f.base, 'az-calls.txt');
  write(f.base, 'fake-az.sh', `az() {
  printf '%s\\t' "$@" >> "$AZ_TEST_CALLS"
  printf '\\n' >> "$AZ_TEST_CALLS"
  if [[ "$1 $2 $3" == 'pipelines queue list' ]]; then
    [[ "$AZ_TEST_MODE" == 'queue-fails' ]] && return 17
    [[ "$AZ_TEST_MODE" == 'empty-queue' ]] || printf '42\\n'
    return 0
  fi
  if [[ "$1 $2" == 'pipelines create' && "$AZ_TEST_MODE" == 'create-fails' ]]; then return 23; fi
  return 0
}
`);
  const result = run(bash, ['--noprofile', '--norc', '-c',
    'source "$AZ_TEST_STUB"; export -f az; bash "$@"', 'fixture',
    posix(creator), 'New taxi project', 'Project with spaces; literal', posix(f.target)], {
    env: { ...environment, AZ_TEST_STUB: posix(stub), AZ_TEST_CALLS: posix(calls), AZ_TEST_MODE: mode,
      SYSTEM_COLLECTIONURI: 'https://dev.azure.com/example/' },
  });
  const recorded = fs.readFileSync(calls, 'utf8').trim().split(/\r?\n/).map(line => line.trimEnd().split('\t'));
  return { ...f, result, calls: recorded };
}

test('pipeline creation registers only top-level YAML files and handles names with spaces literally', () => {
  const { result, calls } = pipelineFixture();
  ok(result);
  const creates = calls.filter(args => args[0] === 'pipelines' && args[1] === 'create');
  assert.equal(creates.length, 4, 'Three ML entry points and one infrastructure entry point.');
  for (const args of creates) {
    for (const [flag, value] of [
      ['--repository', 'New taxi project'], ['--project', 'Project with spaces; literal'],
      ['--branch', 'main'], ['--skip-first-run', 'true'], ['--queue-id', '42'],
      ['--organization', 'https://dev.azure.com/example/'],
    ]) assert.equal(args[args.indexOf(flag) + 1], value);
    const file = args[args.indexOf('--yml-path') + 1];
    assert.match(file, /\.(?:yml|yaml)$/);
    assert.doesNotMatch(file, /templates|require-success|notes/);
  }
});

test('pipeline registration failure stops later creation and propagates the exit status', () => {
  const { result, calls } = pipelineFixture('create-fails');
  assert.equal(result.status, 23);
  assert.equal(calls.filter(args => args[1] === 'create').length, 1);
});

test('queue lookup failure fails before creating folders or pipelines', () => {
  const { result, calls } = pipelineFixture('queue-fails');
  assert.equal(result.status, 17);
  assert.equal(calls.length, 1);
});

test('an empty queue lookup retains the documented no-queue fallback', () => {
  const { result, calls } = pipelineFixture('empty-queue');
  ok(result);
  assert.match(result.stderr, /No queue ID/);
  for (const args of calls) assert.equal(args.includes('--queue-id'), false);
});

test('the real repaired taxi snapshot generates unchanged and passes its copied regression suites', {
  skip: !process.env.TAXI_TEMPLATE_ROOT,
}, () => {
  const f = fixture();
  f.source = path.resolve(process.env.TAXI_TEMPLATE_ROOT);
  const before = fingerprint(f.source);
  ok(initialize(f));
  assert.deepEqual(fingerprint(f.source), before, 'Real template files and Git metadata remain untouched.');
  assert.deepEqual(fingerprint(f.target, true), fingerprint(f.source, true));
  ok(run(process.execPath, ['--test', 'tests/ml-pipeline-config.test.cjs'], { cwd: f.target, timeout: 180000 }));
  if (process.env.TAXI_TEST_PYTHON) {
    ok(run(process.env.TAXI_TEST_PYTHON, ['-B', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py', '-v'], {
      cwd: f.target, timeout: 180000,
    }));
  }
});
