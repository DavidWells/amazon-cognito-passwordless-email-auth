// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { AuthService } from '../auth.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-choose-medium',
  templateUrl: './choose-medium.component.html',
  styleUrls: ['./choose-medium.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChooseMediumComponent {

  private busy_ = new BehaviorSubject(false);
  public busy = this.busy_.asObservable();

  private choice_ = new BehaviorSubject<"email" | "sms">(undefined);
  public choice = this.choice_.asObservable();

  private errorMessage_ = new BehaviorSubject('');
  public errorMessage = this.errorMessage_.asObservable();

  constructor(private router: Router, private auth: AuthService) { }

  public async chooseEmailOrSms(medium: "email" | "sms") {
    this.choice_.next(medium);
    this.busy_.next(true);
    this.errorMessage_.next('');
    try {
      await this.auth.chooseEmailOrSms(medium);
      this.router.navigate(['/enter-secret-code']);
    } catch (err) {
      this.errorMessage_.next(err.message || err);
    } finally {
      this.busy_.next(false);
    }
  }
}
