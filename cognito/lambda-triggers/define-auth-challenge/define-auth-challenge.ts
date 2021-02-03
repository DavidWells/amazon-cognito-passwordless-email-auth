// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  DefineAuthChallengeTriggerHandler,
  DefineAuthChallengeTriggerEvent,
} from "aws-lambda";

export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

  if (!event.request.session || !event.request.session.length) {
    // The auth flow just started, send a custom challenge
    return customChallenge(event);
  }

  if (
    event.request.session &&
    event.request.session.find(
      (attempt) => attempt.challengeName !== "CUSTOM_CHALLENGE"
    )
  ) {
    // We only accept custom challenges; fail auth
    return deny(event);
  }

  // If the user answered the secret challenge correctly, succeed auth
  const lastResponse = event.request.session.slice(-1)[0];
  const lastChallenge = JSON.parse(
    lastResponse.challengeMetadata!
  ) as ChallengeMetadata;
  if (
    lastChallenge.challenge === "PROVIDE_SECRET_CODE" &&
    lastResponse.challengeResult === true
  ) {
    return allow(event);
  }

  // Determine the amount of times the user tried a wrong secret login code
  const failedSecretLoginCodeChallenges = event.request.session
    .map(
      (session) => JSON.parse(session.challengeMetadata!) as ChallengeMetadata
    )
    .filter(
      (challengeMetadata) =>
        challengeMetadata.challenge === "PROVIDE_SECRET_CODE"
    );
  // You're only allowed to try 3 times
  if (failedSecretLoginCodeChallenges.length >= 3) {
    return deny(event);
  }

  // Send the user a custom challenge again
  return customChallenge(event);
};

function deny(event: DefineAuthChallengeTriggerEvent) {
  event.response.issueTokens = false;
  event.response.failAuthentication = true;
  return event;
}

function allow(event: DefineAuthChallengeTriggerEvent) {
  event.response.issueTokens = true;
  event.response.failAuthentication = false;
  return event;
}

function customChallenge(event: DefineAuthChallengeTriggerEvent) {
  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  event.response.challengeName = "CUSTOM_CHALLENGE";
  return event;
}

type ChallengeMetadata =
  | {
      challenge: "CHOOSE_EMAIL_OR_SMS";
    }
  | {
      challenge: "PROVIDE_SECRET_CODE";
      secretLoginCode: string;
    };
