const mkdirp = require('mkdirp')
const path = require('path')
const fs = require('fs')

const shell = require('shelljs')

const errors = []

/**
 * Logs out all messages and errors added to the respective arrays
 * @param cliTools
 */
const logErrors = (cliTools) => {
  if (errors.length > 0) {
    errors.push('Static assets couldn\'t process every given paths')
  }

  errors.forEach(error => {
    cliTools.warn(error)
  })
}

/**
 * Tries to copy recursively all files from source path to a destination path
 * @param srcPath
 * @param destPath
 * @returns {*}
 */
const copyFromSrcToDest = (srcPath, destPath) => {
  try {
    if (fs.lstatSync(srcPath).isDirectory()) {
      srcPath = path.join(srcPath, '*')
    }

    mkdirp(destPath, () => {
      shell.cp('-r', srcPath, destPath)
    })
  } catch (e) {
    return e
  }
}

/**
 * Builds all source and destination paths, calls a copy function and collects messages and errors. Returns total number of paths processed
 * @param staticAssetCfg
 */
const processPaths = function (staticAssetCfg) {
  const srcBasePath = staticAssetCfg.basePaths.src
  const destBasePath = staticAssetCfg.basePaths.dest
  const assetPaths = staticAssetCfg.assetPaths

  // Loops through each item to copy them
  assetPaths.forEach((currentPaths) => {
    const currentSrcPath = path.join(srcBasePath, currentPaths.src)
    const currentDestPath = path.join(destBasePath, currentPaths.dest)

    // Copies source to destination path
    const error = copyFromSrcToDest(currentSrcPath, currentDestPath)
    if (error) {
      errors.push(error)
    }
  })
}

/**
 * Main function that runs on build
 * @param core
 */
const build = (core) => {
  const config = core.getConfig()
  const cliTools = core.getCliTools()
  const jobManager = core.getJobmanager()

  if (!config.staticAsset.assetPaths) {
    cliTools.warn('Static asset executed but no config set')
    return
  }

  jobManager.addJob('staticAssets', 'Copy static assets', 'staticAsset')
  jobManager.setSubJobTotalCount('staticAssets', 1)

  mkdirp(config.staticAsset.basePaths.dest).then(function () {
    processPaths(config.staticAsset)
    jobManager.reportFinishJob('staticAssets')
    jobManager.finishJob('staticAssets')
  }, function() {
    errors.push(`there were problems while creating ${config.staticAsset.basePaths.dest}`)
    logErrors(cliTools)
    jobManager.finishJob('staticAssets')
  })
}

module.exports = build

