/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { environment } from '../../environments/environment'
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { catchError, map, switchMap } from 'rxjs/operators'
import { Observable, Subject } from 'rxjs'

const clientId = '1005568560502-6hm16lef8oh46hr2d98vf2ohlnj4nfhq.apps.googleusercontent.com'

interface Passwords {
  current?: string
  new?: string
  repeat?: string
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  public isLoggedIn = new Subject<any>()
  private readonly hostServer = environment.hostServer
  private readonly host = this.hostServer + '/api/Users'

  constructor (private readonly http: HttpClient) { }

  find (params?: any) {
    return this.http.get(this.hostServer + '/rest/user/authentication-details/', { params }).pipe(map((response: any) =>
      response.data), catchError((err) => { throw err }))
  }

  get (id: number) {
    return this.http.get(`${this.host}/${id}`).pipe(map((response: any) => response.data), catchError((err) => { throw err }))
  }

  save (params: any) {
    return this.http.post(this.host + '/', params).pipe(
      map((response: any) => response.data),
      catchError((err) => { throw err })
    )
  }

  login (params: any) {
    this.isLoggedIn.next(true)
    return this.http.post(this.hostServer + '/rest/user/login', params).pipe(map((response: any) => response.authentication), catchError((err) => { throw err }))
  }

  getLoggedInState () {
    return this.isLoggedIn.asObservable()
  }

  changePassword (passwords: Passwords) {
    return this.http.get(this.hostServer + '/rest/user/change-password?current=' + passwords.current + '&new=' +
    passwords.new + '&repeat=' + passwords.repeat).pipe(map((response: any) => response.user), catchError((err) => { throw err.error }))
  }

  resetPassword (params: any) {
    return this.http.post(this.hostServer + '/rest/user/reset-password', params).pipe(map((response: any) => response.user), catchError((err) => { throw err }))
  }

  whoAmI () {
    return this.http.get(this.hostServer + '/rest/user/whoami').pipe(map((response: any) => response.user), catchError((err) => { throw err }))
  }

  oauthLogin (params: any): Observable<any>{
    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?access_token=${params.access_token}`;
    const userInfoUrl  = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${params.access_token}`;

    return this.http.get<{ aud: string }>(tokenInfoUrl).pipe(
      switchMap(tokenInfo => {
        const goodAud   = tokenInfo.aud === clientId;
        const goodState = params.state === localStorage.getItem('oauthState');
        if (goodAud && goodState) {
          return this.http.get(userInfoUrl);
        } else {
          return this.whoAmI();
        }
      })
    )
  }

  saveLastLoginIp () {
    return this.http.get(this.hostServer + '/rest/saveLoginIp').pipe(map((response: any) => response), catchError((err) => { throw err }))
  }

  deluxeStatus () {
    return this.http.get(this.hostServer + '/rest/deluxe-membership').pipe(map((response: any) => response.data), catchError((err) => { throw err }))
  }

  upgradeToDeluxe (paymentMode: string, paymentId: any) {
    return this.http.post(this.hostServer + '/rest/deluxe-membership', { paymentMode, paymentId }).pipe(map((response: any) => response.data), catchError((err) => { throw err }))
  }
}
