const path = require('path')
const lintHandler = require('./lib/handler/lint')

const configFileNames = ['.eslintrc', '.eslintrc.js', '.eslintrc.yaml', '.eslintrc.yml', '.eslintrc.json']
const ignoreFileNames = ['.eslintignore']

const defaultConfigFileName = '.eslintrc.js'
const defaultIgnoreFileName = '.eslintignore'

class ESLint {
  constructor (core) {
    this.config = core.getConfig()
    this.projectPackageJson = require(path.join(this.config.paths.project, 'package.json'))

    this.listeners = [
      {
        command: 'config',
        priority: 100,
        handler: (core) => {
          const config = core.getConfig()

          config.paths.eslint = __dirname

          config.eslint = {
            useWebpackLoader: true,
            breakOnError: false,
            configFilePath: this.isConfigAvailableInProject() ? this.getProjectConfigFile(configFileNames) : path.join(config.paths.eslint, defaultConfigFileName),
            ignoreFilePath: this.isIgnoreConfigAvailableInProject() ? null : path.join(config.paths.eslint, defaultIgnoreFileName),
            fixErrors: false,
            cache: true,
            cacheFile: path.join(this.config.paths.project, '.cache/eslint/cache'),
            extentions: ['.js']
          }
        }
      },
      {
        command: 'config',
        priority: -50,
        handler: function (core) {
          const config = core.getConfig()
          const cliTools = core.getCliTools()

          if (!config.eslint.useWebpackLoader) {
            return
          }

          if (!config.webpackConfig || !config.webpackConfig.module || !config.webpackConfig.module.rules) {
            cliTools.warn('ESLint is configured to use a webpack loader but there is no webpack config availbale')
            return
          }

          const loaderConfig = {
            enforce: 'pre',
            test: /\.js$/,
            loader: 'eslint-loader',
            exclude: /(node_modules|dist)/,
            options: {
              emitWarning: true,
              useEslintrc: false,
              configFile: config.eslint.configFilePath,
              fix: false, // webpack eslint should NOT fix problems (commonly used this config in dev mode, with watcher)
              cache: config.eslint.cache,
              cacheFile: config.eslint.cacheFile
            }
          }

          // When break on error config is set, set configs to break the webpack compiler
          if (config.eslint.breakOnError) {
            loaderConfig.options.emitWarning = false
          }

          config.webpackConfig.module.rules.push(loaderConfig)
        }
      },
      {
        command: 'lint',
        description: 'Lint Javascript with ES Lint',
        handler: lintHandler
      },
      {
        command: 'fixLint',
        description: 'Lint Javascript with ES Lint and automaticly fix fixable issues',
        handler: function (core) {
          const config = core.getConfig()
          config.eslint.fixErrors = true
          lintHandler(core)
        }
      },
      {
        command: 'build',
        priority: 10,
        description: 'Lint Javascript with ES Lint',
        handler: function (core) {
          // Set break on error configs to true for production build
          const config = core.getConfig()

          config.eslint.useWebpackLoader = false
          config.eslint.breakOnError = true
        }
      },
      {
        command: 'build',
        handler: function (core) {
          // Run the standalone linter
          const config = core.getConfig()

          if (!config.eslint.useWebpackLoader) {
            lintHandler(core)
          }
        }
      },
      {
        command: 'watchWebpackJs',
        handler: function (core) {
          // Run the standalone linter
          const config = core.getConfig()

          if (!config.eslint.useWebpackLoader) {
            lintHandler(core)
          }
        }
      }
    ]
  }

  isConfigAvailableInProject () {
    if (this.projectPackageJson.hasOwnProperty('eslintConfig')) {
      return true
    }

    return this.isOneOfFilesExistingInProjectRoot(configFileNames)
  }

  isIgnoreConfigAvailableInProject () {
    if (this.projectPackageJson.hasOwnProperty('eslintIgnore')) {
      return true
    }

    return this.isOneOfFilesExistingInProjectRoot(ignoreFileNames)
  }

  getProjectConfigFile (fileNames) {
    const fs = require('fs')
    for (const fileName of fileNames) {
      const testPath = path.join(this.config.paths.project, fileName)
      if (fs.existsSync(testPath)) {
        return testPath
      }
    }

    return ''
  }

  isOneOfFilesExistingInProjectRoot (fileNames) {
    const fs = require('fs')
    for (const fileName of fileNames) {
      if (fs.existsSync(path.join(this.config.paths.project, fileName))) {
        return true
      }
    }

    return false
  }

  getListeners () {
    return this.listeners
  }
}

module.exports = ESLint
