// =========================================================================
// Copyright ©  2017 T-Mobile USA, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// =========================================================================

/**
API for the admin user to retrieve the installer vars JSON
@author:
@version: 1.0
 **/

'use strict';
const errorHandlerModule = require("./components/error-handler.js"); //Import the error codes module.
const responseObj = require("./components/response.js"); //Import the response module.
const configObj = require("./components/config.js"); //Import the environment data.
const logger = require("./components/logger.js"); //Import the logging module.
const request = require('request');
function handler(event, context, cb) {
  //Initializations
  var errorHandler = errorHandlerModule();
  var config = configObj(event);
  logger.init(event, context);

  try {
    apiResponseObj = {};
    if (event && event.method && event.method === 'GET') {
      if (!event.principalId) {
        logger.error('Authorizer did not send the user information, please check if authorizer is enabled and is functioning as expected!');
        return cb(JSON.stringify(errorHandler.throwUnauthorizedError("User is not authorized to access this service|Authorization Incomplete")));
      }
      if (event.principalId != config.ADMIN_ID) {
        return cb(JSON.stringify(errorHandler.throwUnauthorizedError("This User does not have the privileges to  access this service")));
      }
      getInstallerVarsJSON(config).then((data) => {
        apiResponseObj.installerVars = data;
        return cb(null, responseObj(apiResponseObj, event.body));
      }).catch((error) => {
        logger.error("Failed to load admin config file:", error);
        cb(JSON.stringify(errorHandler.throwInternalServerError("Failed to load config file.")));
      });
    } else {
      return cb(JSON.stringify(errorHandler.throwInputValidationError("The requested method is not supported")));
    }
  } catch (e) {
    cb(JSON.stringify(errorHandler.throwInternalServerError("Unknown Error")));
  }

}
function buildRequestOption(config) {
  if (config.SCM_TYPE === "gitlab") {
    return {
      uri: config.BASE_URL + config.GITLAB_PATH,
      method: 'get',
      headers: {
        "Private-Token": config.PRIVATE_TOKEN_GITLAB
      },
      rejectUnauthorized: false
    };
  } else {
    return {
      uri: config.BASE_URL + config.BITBUCKET_PATH,
      method: 'get',
      headers: {
        "Authorization": 'Basic ' + new Buffer(config.BB_USERNAME + ':' + config.BB_PASSWORD).toString('base64')
      },
      rejectUnauthorized: false
    };
  }
}

function getInstallerVarsJSON(config) {
  return new Promise((resolve, reject) => {
    try {
      var params = buildRequestOption(config);
      request(params, (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          if (response.statuscode != 200) {
            logger.error("Error processing request: " + JSON.stringify(response));
            return reject(response.body.messageor);
          }
          var data = JSON.parse(response.body);
          resolve(data);
        }
      });
    }
    catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  handler,
  getInstallerVarsJSON,
  buildRequestOption
};
