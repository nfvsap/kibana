/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import angular from 'angular';

// This is really silly, but I wasn't prepared to rename the kibana Storage class everywhere it is used
// and this is the only way I could figure out how to use the type definition for a built in object
// in a file that creates a type with the same name as that built in object.
import { WebStorage } from './web_storage';

export class Storage {
  public store: WebStorage;

  constructor(store: WebStorage) {
    this.store = store;
  }

  public get = (key: string) => {
    if (!this.store) {
      return null;
    }

    const storageItem = this.store.getItem(key);
    if (storageItem === null) {
      return null;
    }

    try {
      return JSON.parse(storageItem);
    } catch (error) {
      return null;
    }
  };

  public set = (key: string, value: any) => {
    try {
      return this.store.setItem(key, angular.toJson(value));
    } catch (e) {
      return false;
    }
  };

  public remove = (key: string) => {
    return this.store.removeItem(key);
  };

  public clear = () => {
    return this.store.clear();
  };
}
