import { makeAutoObservable } from 'mobx';
import { adminUiStore } from './admin-ui.store.js';

const ACCESS_TOKEN_KEY = 'zis_admin_access_token';

class AdminSessionStore {
  accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);

  constructor() { makeAutoObservable(this); }

  get isAuthenticated(): boolean { return Boolean(this.accessToken); }

  setSession(accessToken: string) {
    adminUiStore.reset();
    this.accessToken = accessToken;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  clearSession() {
    adminUiStore.reset();
    this.accessToken = null;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export const adminSessionStore = new AdminSessionStore();
