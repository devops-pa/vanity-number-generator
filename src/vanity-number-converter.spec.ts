import { handler } from './vanity-number-converter';
import { expect } from 'chai';
import { ConnectContactFlowEvent, Context } from 'aws-lambda';
import AWS from 'aws-sdk';
import { GetItemInput } from 'aws-sdk/clients/dynamodb';
import AWSMock from 'aws-sdk-mock';
import process from 'process';

describe('vanity-number-converter.ts', () => {
  beforeEach(() => {
    process.env['AWS_REGION'] = 'test';
    process.env['OUTPUT_TABLE_NAME'] = 'foobar';
  })

  it('should generate vanity number for valid caller id', async () => {
    const event: ConnectContactFlowEvent = {
      "Name": "ContactFlowEvent",
      "Details": {
        "ContactData": {
          "Attributes": {},
          "Channel": "VOICE",
          "ContactId": "5ca32fbd-8f92-46af-92a5-6b0f970f0efe",
          "CustomerEndpoint": {
            "Address": "+11239225379",
            "Type": "TELEPHONE_NUMBER"
          },
          "InitialContactId": "5ca32fbd-8f92-46af-92a5-6b0f970f0efe",
          "InitiationMethod": "API",
          "InstanceARN": "arn:aws:connect:us-east-1:123456789012:instance/9308c2a1-9bc6-4cea-8290-6c0b4a6d38fa",
          "MediaStreams": {
            "Customer": {
              "Audio": {
                "StartFragmentNumber": "91343852333181432392682062622220590765191907586",
                "StartTimestamp": "1565781909613",
                "StreamARN": "arn:aws:kinesisvideo:us-east-1:123456789012:stream/connect-contact-a3d73b84-ce0e-479a-a9dc-5637c9d30ac9/1565272947806"
              }
            }
          },
          "PreviousContactId": "5ca32fbd-8f92-46af-92a5-6b0f970f0efe",
          "Queue": null,
          "SystemEndpoint": {
            "Address": "+11234567890",
            "Type": "TELEPHONE_NUMBER"
          }
        },
        "Parameters": {}
      }
    };
    const context: Context = {} as Context;
    const callback = () => { };
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (params: GetItemInput, callback: Function) => {
      console.log('DynamoDB.DocumentClient', 'get', 'mock called');
      callback(null);
    })
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (params: GetItemInput, callback: Function) => {
      console.log('DynamoDB.DocumentClient', 'put', 'mock called');
      callback(null);
    })

    const response = await handler(event, context, callback);
    expect(response.phone).to.be.equal('+11239225379');
    expect(response.vanity_numbers).to.be.a('string').and.satisfy((msg: string) => msg.indexOf('+112392AKES9, +11239225DRY, +11239225FRY') === 0);
    AWSMock.restore('DynamoDB.DocumentClient');
  });

  it('should load vanity numbers from db', async () => {
    const event: ConnectContactFlowEvent = {
      "Name": "ContactFlowEvent",
      "Details": {
        "ContactData": {
          "Attributes": {},
          "Channel": "VOICE",
          "ContactId": "5ca32fbd-8f92-46af-92a5-6b0f970f0efe",
          "CustomerEndpoint": {
            "Address": "+11239225379",
            "Type": "TELEPHONE_NUMBER"
          },
          "InitialContactId": "5ca32fbd-8f92-46af-92a5-6b0f970f0efe",
          "InitiationMethod": "API",
          "InstanceARN": "arn:aws:connect:us-east-1:123456789012:instance/9308c2a1-9bc6-4cea-8290-6c0b4a6d38fa",
          "MediaStreams": {
            "Customer": {
              "Audio": {
                "StartFragmentNumber": "91343852333181432392682062622220590765191907586",
                "StartTimestamp": "1565781909613",
                "StreamARN": "arn:aws:kinesisvideo:us-east-1:123456789012:stream/connect-contact-a3d73b84-ce0e-479a-a9dc-5637c9d30ac9/1565272947806"
              }
            }
          },
          "PreviousContactId": "5ca32fbd-8f92-46af-92a5-6b0f970f0efe",
          "Queue": null,
          "SystemEndpoint": {
            "Address": "+11234567890",
            "Type": "TELEPHONE_NUMBER"
          }
        },
        "Parameters": {}
      }
    };
    const context: Context = {} as Context;
    const callback = () => { };
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (params: GetItemInput, callback: Function) => {
      console.log('DynamoDB.DocumentClient', 'get', 'mock called');
      callback(null, { Item: { phone: '+11239436657', vanity_numbers: ['+11239BAKERY', '+11239225FRY', '+112392256RY'] } });
    })
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (params: GetItemInput, callback: Function) => {
      console.log('DynamoDB.DocumentClient', 'put', 'mock called');
      callback(null, { statusCode: 'foo', body: '' });
    })

    const response = await handler(event, context, callback);
    expect(response.phone).to.be.equal('+11239225379');
    expect(response.vanity_numbers).to.be.a('string').and.satisfy((msg: string) => msg.indexOf('+11239BAKERY, +11239225FRY, +112392256RY') === 0);
    AWSMock.restore('DynamoDB.DocumentClient');
  });
});