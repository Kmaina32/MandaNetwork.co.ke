// Run Jest with the development React runtime even when CI is launched by a production build.
process.env.NODE_ENV = 'test';
require('jest').run(['--runInBand', '--passWithNoTests']);
