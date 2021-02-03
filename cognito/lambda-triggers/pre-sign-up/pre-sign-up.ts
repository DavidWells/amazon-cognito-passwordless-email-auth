// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { PreSignUpTriggerHandler } from 'aws-lambda';

export const handler: PreSignUpTriggerHandler = async event => {
    console.log(JSON.stringify(event, null, 2));
    event.response.autoConfirmUser = true;
    return event;
};
