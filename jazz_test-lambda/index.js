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
Nodejs Template Project
@author:
@version: 1.0
 **/

const errorHandlerModule = require("./components/error-handler.js"); //Import the error codes module.
const responseObj = require("./components/response.js"); //Import the response module.
const configObj = require("./components/config.js"); //Import the environment data.
const logger = require("./components/logger.js"); //Import the logging module.
const utils = require("./components/utils.js");
const aws = require('aws-sdk');
const validateARN = utils.validateARN;
const execStatus = utils.execStatus();

var handler = (event, context, cb) => {

  'use strict';
  //Initializations
  var errorHandler = errorHandlerModule();
  var config = configObj(event);
  logger.init(event, context);
  var awsRegion;
  try {
    var testResponse = {
      "execStatus": null,
      "payload": null,
    };
    if (!event && !event.method && event.method !== 'POST') {
      return cb(JSON.stringify(errorHandler.throwNotFoundError("Method not found")));
    }
    if (!event.body) {
      return cb(JSON.stringify(errorHandler.throwInputValidationError("Request payload cannot be empty")));
    }
    if (!validateARN(event.body.functionARN)) {
      return cb(JSON.stringify(errorHandler.throwInputValidationError("Function ARN is invalid")));
    }
    if (!event.body.inputJSON) {
      return cb(JSON.stringify(errorHandler.throwInputValidationError("Input for function is not defined")));
    }
    var functionARN = event.body.functionARN;
    var arnvalues = functionARN.split(":");
    awsRegion = arnvalues[3]; //["arn","aws","lambda","us-east-1","000000""] spliting FunctionARN to get the aws-region 
    var inputJSON = event.body.inputJSON;

    invokeLambda(functionARN, inputJSON, awsRegion).then((data) => {

      if (data && data.StatusCode >=200 && data.StatusCode<299) {
        testResponse.payload = data;
        if (!data.FunctionError) {
          //Function Executed Succesfully Without Error 
          testResponse.execStatus = execStatus.success;
        } else {
          if (data.FunctionError === "Handled") {
            testResponse.execStatus = execStatus.handledError;
          } else if (data.FunctionError === "Unhandled") {
            // Function Execution Had Unhandled Error 
            testResponse.execStatus = execStatus.unhandledError;
          }
        }
      } else {
        // Function Falied |Cause Unknown|TEST FAILED 
        return cb(JSON.stringify(errorHandler.throwInternalServerError("Unknown internal error occurred when invoking " + functionARN)));
      }
      testResponse.payload = data;
      return cb(null, responseObj(testResponse, event.body));
    }).catch((err) => {
      // Funtion Failed To Be Invoked |TEST FAILED
      testResponse.execStatus = execStatus.functionInvocationError;
      testResponse.payload = err;
      return cb(null, responseObj(testResponse, event.body));
    });
  } catch (err) {
    return cb(JSON.stringify(errorHandler.throwInternalServerError("Unknown internal error occurred when invoking the function")));
  }
};

var invokeLambda = (functionARN, inputJSON, awsRegion) => {
  'use strict';
  return new Promise((resolve, reject) => {
    try {
      var lambda = new aws.Lambda({
        region: awsRegion
      });
      lambda.invoke({
        FunctionName: functionARN,
        Payload: JSON.stringify(inputJSON)
      }, function (error, data) {
        if (error) {
          logger.error("Error In Lambda Execution:", error);
          reject(error);
        } else {
          logger.debug("Lambda Executed Succesfully:", data);
          resolve(data);
        }
      });
    } catch (e) {
      logger.error(e);
      reject("Error In Invoking Lambda");
    }
  });
};
module.exports = {
  handler: handler,
  invokeLambda: invokeLambda
};