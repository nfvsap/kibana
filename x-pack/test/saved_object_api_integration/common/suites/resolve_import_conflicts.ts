/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SuperTest } from 'supertest';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';
import { getIdPrefix, getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface ResolveImportConflictsTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface ResolveImportConflictsTests {
  default: ResolveImportConflictsTest;
  unknownType: ResolveImportConflictsTest;
}

interface ResolveImportConflictsTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: ResolveImportConflictsTests;
}

const createImportData = (spaceId: string) => [
  {
    type: 'dashboard',
    id: `${getIdPrefix(spaceId)}a01b2f57-fcfd-4864-b735-09e28f0d815e`,
    attributes: {
      title: 'A great new dashboard',
    },
  },
  {
    type: 'globaltype',
    id: '05976c65-1145-4858-bbf0-d225cc78a06e',
    attributes: {
      name: 'A new globaltype object',
    },
  },
];

export function resolveImportConflictsTestSuiteFactory(
  es: any,
  esArchiver: any,
  supertest: SuperTest<any>
) {
  const createExpectResults = (spaceId = DEFAULT_SPACE_ID) => async (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      success: true,
      successCount: 1,
    });
  };

  const expectUnknownType = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      success: false,
      successCount: 1,
      errors: [
        {
          id: '1',
          type: 'wigwags',
          error: {
            message: `Unsupported saved object type: 'wigwags': Bad Request`,
            statusCode: 400,
            error: 'Bad Request',
          },
        },
      ],
    });
  };

  const expectRbacForbidden = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to bulk_create dashboard, missing action:saved_objects/dashboard/bulk_create`,
    });
  };

  const expectRbacForbiddenWithUnknownType = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to bulk_create dashboard,wigwags, missing action:saved_objects/dashboard/bulk_create,action:saved_objects/wigwags/bulk_create`,
    });
  };

  const expectRbacForbiddenForUnknownType = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to bulk_create dashboard,wigwags, missing action:saved_objects/wigwags/bulk_create`,
    });
  };

  const makeResolveImportConflictsTest = (describeFn: DescribeFn) => (
    description: string,
    definition: ResolveImportConflictsTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.default.statusCode}`, async () => {
        const data = createImportData(spaceId);
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_resolve_import_conflicts`)
          .auth(user.username, user.password)
          .field(
            'overwrites',
            JSON.stringify([
              {
                type: 'dashboard',
                id: `${getIdPrefix(spaceId)}a01b2f57-fcfd-4864-b735-09e28f0d815e`,
              },
            ])
          )
          .attach(
            'file',
            Buffer.from(data.map(obj => JSON.stringify(obj)).join('\n'), 'utf8'),
            'export.ndjson'
          )
          .expect(tests.default.statusCode)
          .then(tests.default.response);
      });

      describe('unknown type', () => {
        it(`should return ${tests.unknownType.statusCode}`, async () => {
          const data = createImportData(spaceId);
          data.push({
            type: 'wigwags',
            id: '1',
            attributes: {
              title: 'Wigwags title',
            },
          });
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_resolve_import_conflicts`)
            .auth(user.username, user.password)
            .field(
              'overwrites',
              JSON.stringify([
                {
                  type: 'wigwags',
                  id: '1',
                },
                {
                  type: 'dashboard',
                  id: `${getIdPrefix(spaceId)}a01b2f57-fcfd-4864-b735-09e28f0d815e`,
                },
              ])
            )
            .attach(
              'file',
              Buffer.from(data.map(obj => JSON.stringify(obj)).join('\n'), 'utf8'),
              'export.ndjson'
            )
            .expect(tests.unknownType.statusCode)
            .then(tests.unknownType.response);
        });
      });
    });
  };

  const resolveImportConflictsTest = makeResolveImportConflictsTest(describe);
  // @ts-ignore
  resolveImportConflictsTest.only = makeResolveImportConflictsTest(describe.only);

  return {
    resolveImportConflictsTest,
    createExpectResults,
    expectRbacForbidden,
    expectUnknownType,
    expectRbacForbiddenWithUnknownType,
    expectRbacForbiddenForUnknownType,
  };
}
