// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  CreateAuthChallengeTriggerHandler,
  CreateAuthChallengeTriggerEvent,
} from "aws-lambda";
import { randomDigits } from "crypto-secure-random-digit";
import { SES, SNS } from "aws-sdk";

const ses = new SES();
const sns = new SNS();

export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

  if (!event.request.session || !event.request.session.length) {
    // This is the first time Create Auth Challenge is called
    // Create a dummy challenge, allowing the user to send a challenge response
    // with client metadata
    return chooseEmailOrSms(event);
  }

  // Extract the challenge metadata we set earlier
  const lastResponse = event.request.session.slice(-1)[0];
  const lastChallenge = JSON.parse(
    lastResponse.challengeMetadata!
  ) as ChallengeMetadata;

  if (lastChallenge.challenge === "CHOOSE_EMAIL_OR_SMS") {
    // The last challenge was to choose the medium
    // Now, use that medium to send the new challenge
    const medium = event.request.clientMetadata?.medium as unknown;
    if (!medium || (medium !== "sms" && medium !== "email")) {
      // Client did not provide a valid choice, so let's ask again
      return chooseEmailOrSms(event);
    }
    // Send challenge with new secret login code
    return respondToNewSecretLoginCode(event, medium);
  }

  if (lastChallenge.challenge === "PROVIDE_SECRET_CODE") {
    // The last challenge was to provide a secret login code, and since we are
    // here that can only mean that the user provided a wrong value, maybe a typo
    // We'll give the user another chance to enter the existing secret login code
    respondToExistingSecretLoginCode(event, lastChallenge.secretLoginCode);
  }
};

async function sendEmail(emailAddress: string, secretLoginCode: string) {
  const params: SES.SendEmailRequest = {
    Destination: { ToAddresses: [emailAddress] },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<html><body><p>This is your secret login code:</p><h3>${secretLoginCode}</h3></body></html>`,
        },
        Text: {
          Charset: "UTF-8",
          Data: `Your secret login code: ${secretLoginCode}`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Your secret login code",
      },
    },
    Source: process.env.SES_FROM_ADDRESS!,
  };
  await ses.sendEmail(params).promise();
}

async function sendSms(phoneNumber: string, secretLoginCode: string) {
  const params: SNS.PublishInput = {
    Message: `Your secret login code: ${secretLoginCode}`,
    PhoneNumber: phoneNumber,
  };
  await sns.publish(params).promise();
}

type ChallengeMetadata =
  | {
      challenge: "CHOOSE_EMAIL_OR_SMS";
    }
  | {
      challenge: "PROVIDE_SECRET_CODE";
      secretLoginCode: string;
    };

function chooseEmailOrSms(event: CreateAuthChallengeTriggerEvent) {
  const publicChallengeParameters = { challenge: "CHOOSE_EMAIL_OR_SMS" };
  event.response = {
    challengeMetadata: JSON.stringify(
      publicChallengeParameters as ChallengeMetadata
    ),
    privateChallengeParameters: {},
    publicChallengeParameters,
  };
  return event;
}

async function respondToNewSecretLoginCode(
  event: CreateAuthChallengeTriggerEvent,
  medium: "sms" | "email"
) {
  const secretLoginCode = randomDigits(6).join("");
  if (medium === "email") {
    await sendEmail(event.request.userAttributes.email, secretLoginCode);
  } else if (medium === "sms") {
    await sendSms(event.request.userAttributes.phone_number, secretLoginCode);
  }
  const publicChallengeParameters = { challenge: "PROVIDE_SECRET_CODE", medium };
  event.response = {
    challengeMetadata: JSON.stringify({
      ...publicChallengeParameters,
      secretLoginCode,
    } as ChallengeMetadata),
    privateChallengeParameters: {
      secretLoginCode,
    },
    publicChallengeParameters,
  };
  return event;
}

function respondToExistingSecretLoginCode(
  event: CreateAuthChallengeTriggerEvent,
  secretLoginCode: string
) {
  const publicChallengeParameters = { challenge: "PROVIDE_SECRET_CODE" };
  event.response = {
    challengeMetadata: JSON.stringify({
      ...publicChallengeParameters,
      secretLoginCode,
    } as ChallengeMetadata),
    privateChallengeParameters: {
      secretLoginCode,
    },
    publicChallengeParameters,
  };
  return event;
}
