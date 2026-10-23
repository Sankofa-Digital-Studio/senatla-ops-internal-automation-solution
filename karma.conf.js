// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/app'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: process.env.CI === 'true' ? ['progress'] : ['progress', 'kjhtml'],
    port: 9876,
    hostname: '127.0.0.1',
    listenAddress: '127.0.0.1',
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: process.env.CI !== 'true',
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox'],
      },
    },
    captureTimeout: 60000,
    browserNoActivityTimeout: 60000,
    browserDisconnectTimeout: 10000,
    singleRun: process.env.CI === 'true',
    restartOnFileChange: process.env.CI !== 'true'
  });
};
