/**
	Nodejs Lambda Template Project
	@Author:
	@version: 1.0
**/

const configModule = require("./components/config.js");
const logger = require("./components/logger.js");
const responseObj = require("./components/response.js");
const errorHandlerModule = require("./components/error-handler.js");
const CommandMapping = require("./components/CommandMapping.js"); 

module.exports.handler = async (event, context) => {

  //Initializations
  const config = configModule.getConfig(event, context);
  const errorHandler = errorHandlerModule();
  logger.init(event, context);
  var result;
  var data = event.data;
  logger.debug('Data is the following: ' + JSON.stringify(data));
  logger.debug('Event is the following: ' + JSON.stringify(event));


  var commandMapping = new CommandMapping();

  try {
    result = await commandMapping.process(event);
  } 
  catch (error) {
      throw(error);
  }
  return result;
}

