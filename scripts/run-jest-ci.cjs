// Run the complete Jest suite in CI and fail if test discovery finds no tests.
process.env.NODE_ENV = 'test';
require('jest').run(['--runInBand', '--ci']);
