package com.slf.services;

import java.util.HashMap;
import java.util.Map;
import com.amazonaws.services.lambda.runtime.Context; 
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.slf.exceptions.BadRequestException;
import com.slf.model.Response;
import org.apache.log4j.Logger;

/**
 * Java template for authoring AWS lambda functions. This implementation is based on the interface
 * 'RequestHandler' with custom POJO Input/Output 
 * 
 * @author 
 * @version 1.2
 * @date
 * 
 */

public class Handler extends BaseRequestHandler {

	static final Logger logger = Logger.getLogger(Handler.class);
	
    /**
     * Override and implement this method from BaseRequestHandler. This method would have the main
     * processing logic to serve the request from User
     */
	 public Response execute(Map<String, Object> input, Context context) {
		
		/* Request payload will be available in 'this.body' field as a Map. For lambda it will be same as input */ 
		if(this.body==null || this.body.isEmpty()) {
			throw new BadRequestException("Invalid or empty input payload");
		}
		 
    	/* Read environment specific configurations from properties file */
    	// String config_value = configObject.getConfig("config_key");
        // logger.info("You are using the env key: " + config_value);
        
        
        /* Following is an example for retrieving decrypted text for your secret */
        // String secret = configObject.getConfig("mysecret");
        // String plainText = decryptSecret(secret);
        // logger.info("decrypted text: "+plainText);		
		 
		logger.trace("Finer-grained informational events than the DEBUG ");
		logger.info("Interesting runtime events (Eg. connection established, data fetched etc.)");
		logger.warn("Runtime situations that are undesirable or unexpected, but not necessarily \"wrong\".");
		logger.debug("Detailed information on the flow through the system.");
        logger.error("Runtime errors or unexpected conditions.");
        logger.fatal("Very severe error events that will presumably lead the application to abort");
        
        /* Sample output data */
		HashMap<String, String> data = new HashMap<String, String>();
		data.put("key", "value");
		
		return new Response(data, this.body);
	 }
}
