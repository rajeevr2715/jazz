const assert = require('chai').assert;
const expect = require('chai').expect;
const should = require('chai').should();
const awsContext = require('aws-lambda-mock-context');
const AWSCognito = require('amazon-cognito-identity-js');
const sinon = require('sinon');
const index = require('../index');
const logger = require("../components/logger.js");
const errorHandlerModule = require("../components/error-handler.js");
const scmFactory = require("../scm/scmFactory.js");
const configModule = require("../components/config.js");
const responseObj = require("../components/response.js")

var event, context, spy, callback, stub;

//Setting up a spy to wrap mocked cognito functions (stubs) for each test scenario
spy = sinon.spy();

describe('User Management', function() {
  
  
  //Setting up default values for the aws event and context needed for handler params
  beforeEach(function(){
    event = { "method" : "POST",
              "stage" : "test",
              "resourcePath" : "reset",
              "body" : { "username" : "username",
                         "verificationCode" : "123",
                         "email" : "abc@xyz.com"
                       }
            };
    context = awsContext();
	//console.log(context);
    callback = (value) => {
      return value;
    };	
  });
  
  
  it('forget password handler', function(done) {

    // Add your test cases here.
    assert(true);
    done();
  });
  
    
  /*
  * Given an event with no method, handler() shows that a Bad Request has been made
  * @param {object} event containing only stage and body attributes
  * @param {function} callback function that returns what was passed
  * @returns {string} callback function showing error type of Service operation not supported has occured
  */
  it("should throw a invalid or missing arguments for undefined method", function(){
    event.method = undefined;
    var bool = index.handler(event,context,callback).includes("invalid or missing arguments") &&
                index.handler(event,context,callback).includes("101");
    assert.isTrue(bool);
  });
  
  /*
  * Given an event with no method, handler() shows that a undefined resourcePath
  * @param {object} event containing only stage and body attributes
  * @param {function} callback function that returns what was passed
  * @returns {string} callback function showing error type of Service operation not supported has occured
  */
  it("should throw a Service operation not supported error for undefined resourcePath", function(){
    event.resourcePath = undefined;
    var bool = index.handler(event,context,callback).includes("Service operation not supported") &&
                index.handler(event,context,callback).includes("101");
    assert.isFalse(bool);
  });
  

  it("Should throw an error with errorcode 102", function(){
    event.email = undefined;
    index.validateResetParams(event)
    .then(res=> { //console.log(res);
      expect(res).to.have.property('errorCode');
    });
  })

  it("Should throw an error with error ajay", function(){
    event.email = undefined;
    index.validateResetParams(event)
    .then(res=> { //console.log(res);
      expect(res).to.have.property('errorCode');
    });
  })

  it("Should throw an error with errorcode 102", function(){
    event.email = undefined;
    index.validateResetParams(event)
    .catch(res=> { console.log(res);
      expect(res).to.have.property('errorCode');
    });
  })
    
  it("should throw error Email is required field", function(){
    event.email = undefined;
    index.validateUpdatePasswordParams(event)
    .then(res=> { expect(res).to.have.property('102')
    });    
  });

  it('should throw error Email is required field', function () {
    event.email = undefined;
    let result = index.validateUpdatePasswordParams(event); 
    return result
      .catch(error => expect(error).to.include({
        errorCode:'102',
        errorType: 'BadRequest',
			  message: 'Email is required field'
      }));
  });


  it('should throw error verificationCode is required field', function () {
    event.verificationCode = undefined;
    event.email = 'abc@xyz.com';
    let result = index.validateUpdatePasswordParams(event); 
    return result
    .catch(error => expect(error).to.include({
      errorCode:'102',
      errorType: 'BadRequest',
      message: 'Verification code is required'
    }));
  });


  it('should throw error password is required field', function () {
    event.password = undefined;
    event.verificationCode = 'S3cret';
    event.email = 'abc@xyz.com';
    let result = index.validateUpdatePasswordParams(event); 
    return result
    .catch(error => expect(error).to.include({
      errorCode:'102',
      errorType: 'BadRequest',
      message: 'Password is required'
    }));     
  });

  it('should not throw any error', function () {
    event.password = 'P@ssword';
    event.verificationCode = 'S3cret';
    event.email = 'abc@xyz.com';
    let result = index.validateUpdatePasswordParams(event); 
    return result
      .then(rslt => expect(rslt).to.be.equal('success'))
  });

  it('should throw all reqired field errors', function () {
    event.userid = 111;
    let result = index.validateCreaterUserParams(config , event); 
    return result
    .then(err => expect(err).to.include({
      errorCode:'102',
      errorType: 'BadRequest',
      message: 'Password is required'
    }));            
  });

  it('should not throw any error in validateCreaterUserParams function', function () {
    event.userpassword = 'P@ssword';
    event.usercode = 'JAZZ';
    event.email = 'abc@xyz.com';
    event.userid = 111;
    let result = index.validateCreaterUserParams(config , event); 
    return result
      .then(rslt => expect(rslt).to.include(event))      
  });

  /*
  code for SCMFactory class
  */
 config = configModule.getConfig(event, context);
 it('should not throw any error in SCM function', function () {
    event.userpassword = 'P@ssword';
    event.usercode = 'JAZZ';
    event.email = 'abc@xyz.com';
    event.userid = 'R@ndomUserID';
    config.SCM_TYPE = 'gitlab';
    let result = index.getRequestToCreateSCMUser(config , event); 
    expect(result).to.eq(undefined);
          
  });


  
});


