module.exports = {
    'extends': ['@commitlint/config-conventional'],
    'defaultIgnores': false,
    'rules': {
        'type-enum': [2, 'always', [
            'feat',
            'fix',
            'build'
        ]],
        'scope-enum': [2, 'always', [
            'client',
            'server',
            'encoder',
            'decoder',
            'protocol',
            'router',
            'deps',
            'doc',
            'test',
            'config',
            'lint',
            'branch',
            'project'
        ]],
        'scope-empty': [2, 'never'],
        'subject-min-length': [2, 'always', 5],
        'subject-max-length': [2, 'always', 50],
    }
};
