// =========================================================================
// Copyright © 2017 T-Mobile USA, Inc.
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
Fetch metrics per service using CloudWatch APIs
@author:
@version: 1.0
 **/

const errorHandlerModule = require("./components/error-handler.js"); //Import the error codes module.
const responseObj = require("./components/response.js"); //Import the response module.
const configObj = require("./components/config.js"); //Import the environment data.
const logger = require("./components/logger.js")(); //Import the logging module.
const aws = require("aws-sdk"); //Import the secret-handler module.
const request = require('request');
const utils = require("./components/utils.js"); //Import the utils module.
const validateUtils = require("./components/validation.js");
const global_config = require("./config/global-config.json");

function handler (event, context, cb) {

  var errorHandler = errorHandlerModule();
  var config = configObj(event);
  var cloudwatch = new aws.CloudWatch({
    apiVersion: '2010-08-01'
  });

  try {
    /*
     * event input format :
     *   {
     *        "domain": "jazztest",
     *        "service": "get-monitoring-data",
     *        "environment": "prod",
     *        "end_time": "2017-06-27T06:56:00.000Z",
     *        "start_time": "2017-06-27T05:55:00.000Z",
     *        "interval":"300",
     *        "statistics":"average"
     *    }
     */
    var eventBody = event.body;
    genericValidation(event)
      .then(() => validateUtils.validateGeneralFields(eventBody))
      .then(() => getToken(config))
      .then((authToken) => getAssetsDetails(config, eventBody, authToken))
      .then(res => validateAssets(res, eventBody))
      .then(res => getMetricsDetails(res, cloudwatch, config))
      .then(res => {
        var finalObj = utils.massageData(res, eventBody);
        return cb(null, responseObj(finalObj, eventBody));
      })
      .catch(error => {
        if (error.result === "inputError") {
          return cb(JSON.stringify(errorHandler.throwInputValidationError(error.message)));
        } else if (error.result === "notFoundError") {
          return cb(JSON.stringify(errorHandler.throwNotFoundError(error.message)));
        } else if (error.result === "unauthorized") {
          return cb(JSON.stringify(errorHandler.throwUnauthorizedError(error.message)));
        } else {
          return cb(JSON.stringify(errorHandler.throwInternalServerError("Error in fetching cloudwatch metrics")));
        }
      });
  } catch (e) {
    return cb(JSON.stringify(errorHandler.throwInternalServerError("Error in fetching cloudwatch metrics")));
  }

};

function genericValidation(event) {
  return new Promise((resolve, reject) => {
    if (!event && !event.body) {
      reject({
        result: "inputError",
        message: "Invalid Input Error"
      });
    }

    if(!event.method || event.method !== "POST") {
      reject({
        result: "inputError",
        message: "Invalid method"
      });
    }
    if (!event.principalId) {
      reject({
        result: "unauthorized",
        message: "Unauthorized"
      });
    }

    resolve();
  });
}

function getToken(config) {
	logger.debug("Inside getToken");
	return new Promise((resolve, reject) => {
		var svcPayload = {
			uri: config.SERVICE_API_URL + config.TOKEN_URL,
			method: 'post',
			json: {
				"username": config.SERVICE_USER,
				"password": config.TOKEN_CREDS
			},
			rejectUnauthorized: false
		};
		request(svcPayload, (error, response, body) => {
			if (response && response.statusCode === 200 && body && body.data) {
				var authToken = body.data.token;
				resolve(authToken);
			} else {
				var message = "";
				if (error) {
					message = error.message
				} else {
					message = response.body.message
				}
				reject({
					"error": "Could not get authentication token for updating service catalog.",
					"message": message
				});
			}
		});
	});
}

function getAssetsDetails(config, eventBody, authToken) {
  return new Promise((resolve, reject) => {
    var asset_api_payload = {
      "service": eventBody.service,
      "domain": eventBody.domain,
      "environment": eventBody.environment
    };
    var asset_api_options = {
      url: config.SERVICE_API_URL + config.ASSETS_URL,
      headers: {
        "Content-Type": "application/json",
        "Authorization": authToken
      },
      method: "POST",
      rejectUnauthorized: false,
      requestCert: true,
      async: true,
      json: true,
      body: asset_api_payload,
    };

    logger.info("asset_api_options :- " + JSON.stringify(asset_api_options));

    request(asset_api_options, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        var apiAssetsArray = body.data;
        if (apiAssetsArray && apiAssetsArray.length === 0) {
          logger.info("Assets not found for this service, domain, environment. ", JSON.stringify(asset_api_options));
          resolve([]);
        } else {
          var userStatistics = eventBody.statistics.toLowerCase();

          // Massaging data from assets api , to get required list of assets which contains type, asset_name and statistics.
          var assetsArray = utils.getAssetsObj(apiAssetsArray, userStatistics);
          resolve(assetsArray);
        }
      }
    });
  });
}

function validateAssets(assetsArray, eventBody) {
  'use strict';
  return new Promise((resolve, reject) => {
    if (assetsArray.length > 0) {
      var newAssetArray = [];
      var invalidTypeCount = 0;

      assetsArray.forEach((assetItem) => {
        if (assetItem.isError) {
          logger.error(assetItem.isError);
          invalidTypeCount++;
          if (invalidTypeCount === assetsArray.length) {
            reject({
              result: "inputError",
              message: "Unsupported metric type."
            });
          }
        } else {
          var paramMetrics = [];
          var getAssetNameDetails = utils.getNameSpaceAndMetricDimensons(assetItem.type);

          if (!getAssetNameDetails.isError) {
            paramMetrics = getAssetNameDetails.paramMetrics;
            getActualParam(paramMetrics, getAssetNameDetails.awsNameSpace, assetItem, eventBody)
              .then(res => {
                newAssetArray.push({
                  "actualParam": res,
                  "userParam": assetItem
                });
                resolve(newAssetArray);
              })
              .catch(error => {
                reject(error);
              });
          } else {
            logger.error("Unsupported metric type. ");
            reject({
              result: "inputError",
              message: "Unsupported metric type."
            });
          }
        }
      });
    } else {
      reject({
        result: "inputError",
        message: "Metric not found for requested asset"
      });
    }
  });
}

function getActualParam(paramMetrics, awsNameSpace, assetItem, eventBody) {
  'use strict';
  return new Promise((resolve, reject) => {
    // Forming object with parameters required by cloudwatch getMetricStatistics api.
    var commonParam = {

      Namespace: assetItem.type,
      MetricName: "",
      Period: eventBody.interval,
      EndTime: eventBody.end_time,
      StartTime: eventBody.start_time,
      Dimensions: [{
        Name: '',
        Value: assetItem.asset_name
      }, ],
      Statistics: [
        assetItem.statistics,
      ],
      Unit: ""
    };
    var actualParam = [];
    var assetNameObj = assetItem.asset_name;

    commonParam.Namespace = awsNameSpace;
    paramMetrics.forEach((arrayItem) => {
      var clonedObj = {};
      for (let key in commonParam) {
        clonedObj[key] = commonParam[key];
      }
      clonedObj.MetricName = arrayItem.MetricName;
      clonedObj.Unit = arrayItem.Unit;
      var dimensionsArray = arrayItem.Dimensions;
      clonedObj.Dimensions = [];
      var minCount = 0;
      dimensionsArray.forEach((dimensionArr, i) => {
        var obj = {};
        if (assetNameObj[dimensionArr]) {
          obj = {
            "Name": dimensionArr,
            "Value": assetNameObj[dimensionArr]
          };
          if (obj.Name === "StorageType") {
            if (clonedObj.MetricName === "BucketSizeBytes") {
              obj.Value = "StandardStorage";
            } else if (clonedObj.MetricName === "NumberOfObjects") {
              obj.Value = "AllStorageTypes";
            }
          }

          clonedObj.Dimensions.push(obj);
          minCount++;
        }

      });
      if (minCount === 0) {
        logger.error("Invalid asset_name inputs.");
        reject({
          result: "inputError",
          message: "Invalid asset_name inputs."
        });
      }
      actualParam.push(clonedObj);
      resolve(actualParam);
    });
  });
}

function getMetricsDetails(newAssetArray, cloudwatch) {
  return new Promise((resolve, reject) => {
    logger.info("Inside getMetricsDetails", newAssetArray);
    var metricsStatsArray = [];
    newAssetArray.forEach(assetParam => {
      cloudWatchDetails(assetParam, cloudwatch)
        .then(res => {
          metricsStatsArray.push(res);
          if (metricsStatsArray.length === newAssetArray.length) {
            resolve(metricsStatsArray);
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  });
}

function cloudWatchDetails(assetParam, cloudwatch) {
  logger.info("inside cloudWatchDetails")
  return new Promise((resolve, reject) => {
    var metricsStats = [];
    (assetParam.actualParam).forEach((param) => {
      if (param.Namespace === "AWS/CloudFront") {
        cloudwatch = new aws.CloudWatch({
          apiVersion: '2010-08-01',
          region: global_config.CF_REGION
        });
      }
      cloudwatch.getMetricStatistics(param, (err, data) => {
        if (err) {
          logger.error("error while getting metics from cloudwatch. " + JSON.stringify(err));
          if (err.code === "InvalidParameterCombination") {
            reject({
              "result": "inputError",
              "message": err.message
            });
          } else {
            reject({
              "result": "serverError",
              "message": "Unknown internal error occurred"
            });
          }

        } else {
          metricsStats.push(data);
          if (metricsStats.length === assetParam.actualParam.length) {
            var assetObj = utils.assetData(metricsStats, assetParam.userParam);
            resolve(assetObj);
          }
        }
      });
    });
  });
}

const exportable = {
  handler,
  genericValidation,
  getToken,
  getAssetsDetails,
  validateAssets,
  getActualParam,
  getMetricsDetails,
  cloudWatchDetails
}

module.exports = exportable;
