const AWS = require('aws-sdk');

exports.handler = async (event) => {
  try {
    let cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

    switch (event.RequestType) {
      case 'Create':
        await cognitoIdentityServiceProvider.createUserPoolDomain({
          UserPoolId: event.ResourceProperties.UserPoolId,
          Domain: event.ResourceProperties.Domain
        }).promise();
        break;

      case 'Update':
        await deleteUserPoolDomain(cognitoIdentityServiceProvider, event.OldResourceProperties.Domain);

        await cognitoIdentityServiceProvider.createUserPoolDomain({
          UserPoolId: event.ResourceProperties.UserPoolId,
          Domain: event.ResourceProperties.Domain
        }).promise();
        break;

      case 'Delete':
        await deleteUserPoolDomain(cognitoIdentityServiceProvider, event.ResourceProperties.Domain);
        break;
    }

    await sendCloudFormationResponse(event, 'SUCCESS');
    console.info(`CognitoUserPoolDomain Success for request type ${event.RequestType}`);
  } catch (error) {
    console.error(`CognitoUserPoolDomain Error for request type ${event.RequestType}:`, error);
    await sendCloudFormationResponse(event, 'FAILED');
  }
};

async function deleteUserPoolDomain(cognitoIdentityServiceProvider, domain) {
  let response = await cognitoIdentityServiceProvider.describeUserPoolDomain({
    Domain: domain
  }).promise();

  if (response.DomainDescription.Domain) {
    await cognitoIdentityServiceProvider.deleteUserPoolDomain({
      UserPoolId: response.DomainDescription.UserPoolId,
      Domain: domain
    }).promise();
  }
}

async function sendCloudFormationResponse(event, responseStatus, responseData) {
  let params = {
    FunctionName: 'CloudFormationSendResponse',
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      ResponseURL: event.ResponseURL,
      ResponseStatus: responseStatus,
      ResponseData: responseData
    })
  };

  let lambda = new AWS.Lambda();
  let response = await lambda.invoke(params).promise();

  if (response.FunctionError) {
    let responseError = JSON.parse(response.Payload);
    throw new Error(responseError.errorMessage);
  }
}
