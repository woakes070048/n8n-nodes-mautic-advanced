import { snakeCase } from 'change-case';
import {
  type IExecuteFunctions,
  type IDataObject,
  type ILoadOptionsFunctions,
  type INodeExecutionData,
  type INodePropertyOptions,
  type INodeType,
  type INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { campaignContactFields, campaignContactOperations } from './CampaignContactDescription';
import { campaignFields, campaignOperations } from './CampaignDescription';
import { categoryFields, categoryOperations } from './CategoryDescription';
import { companyContactFields, companyContactOperations } from './CompanyContactDescription';
import { companyFields, companyOperations } from './CompanyDescription';
import { contactFields, contactOperations } from './ContactDescription';
import { contactSegmentFields, contactSegmentOperations } from './ContactSegmentDescription';
import { mauticApiRequest, mauticApiRequestAllItems, validateJSON } from './GenericFunctions';
import { segmentEmailFields, segmentEmailOperations } from './SegmentEmailDescription';
import { segmentFields, segmentOperations } from './SegmentDescription';
import { tagFields, tagOperations } from './TagDescription';

export class MauticAdvanced implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Mautic Advanced',
    name: 'mauticAdvanced',
    icon: 'file:MauticAdvanced.svg',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Consume Mautic API with advanced features',
    defaults: {
      name: 'Mautic Advanced',
    },
    usableAsTool: true,
    inputs: ['main'] as any,
    outputs: ['main'] as any,
    credentials: [
      {
        name: 'mauticAdvancedApi',
        required: true,
        displayOptions: {
          show: {
            authentication: ['credentials'],
          },
        },
      },
      {
        name: 'mauticAdvancedOAuth2Api',
        required: true,
        displayOptions: {
          show: {
            authentication: ['oAuth2'],
          },
        },
      },
    ],
    properties: [
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        options: [
          {
            name: 'Credentials',
            value: 'credentials',
          },
          {
            name: 'OAuth2',
            value: 'oAuth2',
          },
        ],
        default: 'credentials',
      },
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Campaign',
            value: 'campaign',
            description: 'Create, update, and retrieve campaigns',
          },
          {
            name: 'Campaign Contact',
            value: 'campaignContact',
            description: 'Add/remove contacts to/from a campaign',
          },
          {
            name: 'Category',
            value: 'category',
            description: 'Create, update, and retrieve categories',
          },
          {
            name: 'Company',
            value: 'company',
            description: 'Create or modify a company',
          },
          {
            name: 'Company Contact',
            value: 'companyContact',
            description: 'Add/remove contacts to/from a company',
          },
          {
            name: 'Contact',
            value: 'contact',
            description: 'Create & modify contacts',
          },
          {
            name: 'Contact Segment',
            value: 'contactSegment',
            description: 'Add/remove contacts to/from a segment',
          },
          {
            name: 'Segment',
            value: 'segment',
            description: 'Create, update, and retrieve segments',
          },
          {
            name: 'Segment Email',
            value: 'segmentEmail',
            description: 'Send an email',
          },
          {
            name: 'Tag',
            value: 'tag',
            description: 'Create, update, and retrieve tags',
          },
        ],
        default: 'contact',
      },
      ...companyOperations,
      ...companyFields,
      ...contactOperations,
      ...contactFields,
      ...contactSegmentOperations,
      ...contactSegmentFields,
      ...campaignOperations,
      ...campaignFields,
      ...campaignContactOperations,
      ...campaignContactFields,
      ...companyContactOperations,
      ...companyContactFields,
      ...segmentEmailOperations,
      ...segmentEmailFields,
      ...tagOperations,
      ...tagFields,
      ...categoryOperations,
      ...categoryFields,
      ...segmentOperations,
      ...segmentFields,
    ],
  };

  methods = {
    loadOptions: {
      // Get all the available companies to display them to user so that they can
      // select them easily
      async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];
        const companies = await mauticApiRequestAllItems.call(
          this,
          'companies',
          'GET',
          '/companies',
        );
        for (const company of companies) {
          returnData.push({
            name: company.fields.all.companyname,
            value: company.fields.all.companyname,
          });
        }
        return returnData;
      },
      // Get all the available tags to display them to user so that they can
      // select them easily
      async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];
        const tags = await mauticApiRequestAllItems.call(this, 'tags', 'GET', '/tags');
        for (const tag of tags) {
          returnData.push({
            name: tag.tag,
            value: tag.tag,
          });
        }
        return returnData;
      },
      // Get all the available stages to display them to user so that they can
      // select them easily
      async getStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];
        const stages = await mauticApiRequestAllItems.call(this, 'stages', 'GET', '/stages');
        for (const stage of stages) {
          returnData.push({
            name: stage.name,
            value: stage.id,
          });
        }
        return returnData;
      },
      // Get all the available company fields to display them to user so that they can
      // select them easily
      async getCompanyFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];
        const fields = await mauticApiRequestAllItems.call(
          this,
          'fields',
          'GET',
          '/fields/company',
        );
        for (const field of fields) {
          returnData.push({
            name: field.label,
            value: field.alias,
          });
        }
        return returnData;
      },
      async getIndustries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];
        const fields = await mauticApiRequestAllItems.call(
          this,
          'fields',
          'GET',
          '/fields/company',
        );
        for (const field of fields) {
          if (field.alias === 'companyindustry') {
            for (const { label, value } of field.properties.list) {
              returnData.push({
                name: label,
                value,
              });
            }
          }
        }
        return returnData;
      },
      // Get all the available contact fields to display them to user so that they can
      // select them easily
      async getContactFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];

        // Add key system fields manually (except last_active, which is already present)
        const systemFields = [
          { name: 'Date Added', value: 'date_added' },
          { name: 'Date Modified', value: 'date_modified' },
          { name: 'ID', value: 'id' },
          { name: 'Owner ID', value: 'owner_id' },
        ];
        returnData.push(...systemFields);

        // Fetch custom and other fields from Mautic
        const fields = await mauticApiRequestAllItems.call(
          this,
          'fields',
          'GET',
          '/fields/contact',
        );
        for (const field of fields) {
          returnData.push({
            name: field.label,
            value: field.alias,
          });
        }
        return returnData;
      },
      // Get all the available segments to display them to user so that they can
      // select them easily
      async getSegments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];
        const segments = await mauticApiRequestAllItems.call(this, 'segments', 'GET', '/segments');
        for (const segment of segments) {
          returnData.push({
            name: segment.name,
            value: segment.id,
          });
        }
        return returnData;
      },
      // Get all the available campaings to display them to user so that they can
      // select them easily
      async getCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];
        const campaings = await mauticApiRequestAllItems.call(
          this,
          'campaigns',
          'GET',
          '/campaigns',
        );
        for (const campaign of campaings) {
          returnData.push({
            name: campaign.name,
            value: campaign.id,
          });
        }
        return returnData;
      },
      // Get all the available emails to display them to user so that they can
      // select them easily
      async getEmails(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];
        const emails = await mauticApiRequestAllItems.call(this, 'emails', 'GET', '/emails');
        for (const email of emails) {
          returnData.push({
            name: email.name,
            value: email.id,
          });
        }
        return returnData;
      },
      // Get all the available list / segment emails to display them to user so that they can
      // select them easily
      async getSegmentEmails(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];
        const emails = await mauticApiRequestAllItems.call(this, 'emails', 'GET', '/emails');
        for (const email of emails) {
          if (email.emailType === 'list') {
            returnData.push({
              name: email.name,
              value: email.id,
            });
          }
        }
        return returnData;
      },
      // Get all the available campaign / template emails to display them to user so that they can
      // select them easily
      async getCampaignEmails(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];
        const emails = await mauticApiRequestAllItems.call(this, 'emails', 'GET', '/emails');
        for (const email of emails) {
          if (email.emailType === 'template') {
            returnData.push({
              name: email.name,
              value: email.id,
            });
          }
        }
        return returnData;
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const length = items.length;
    let qs: IDataObject;
    let responseData;

    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);

    // Handle batch operations that process all items together
    if (resource === 'contact' && operation === 'deleteBatch') {
      // Only process once for all items
      const options = this.getNodeParameter('options', 0, {}) as IDataObject;
      let contactIds = this.getNodeParameter('contactIds', 0, '') as string;
      if (!contactIds) {
        // Fallback: collect from all input items
        const ids = items
          .map((item) => item.json.id)
          .filter((id) => id !== undefined && id !== null && id !== '')
          .map((id) => String(id));
        contactIds = ids.join(',');
      }
      if (!contactIds) {
        throw new NodeOperationError(
          this.getNode(),
          'No contact IDs provided or found in input items.',
        );
      }

      try {
        responseData = await mauticApiRequest.call(
          this,
          'DELETE',
          '/contacts/batch/delete',
          {},
          { ids: contactIds },
        );

        if (options.rawData === false) {
          // Return simplified response
          responseData = {
            success: true,
            deletedIds: contactIds.split(','),
            message: `Successfully deleted ${contactIds.split(',').length} contacts.`,
          };
        }
      } catch (error) {
        if (error instanceof NodeApiError && error.httpCode === '404') {
          responseData = {
            success: true,
            deletedIds: contactIds.split(','),
            message: 'Some contacts were already deleted or not found.',
          };
        } else {
          throw error;
        }
      }

      // Return as a single output item
      return [this.helpers.returnJsonArray([responseData])];
    }

    for (let i = 0; i < length; i++) {
      qs = {};
      try {
        if (resource === 'campaign') {
          if (operation === 'create') {
            const name = this.getNodeParameter('name', i) as string;
            const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
            const body: IDataObject = {
              name,
              ...additionalFields,
            };
            responseData = await mauticApiRequest.call(this, 'POST', '/campaigns/new', body);
            responseData = responseData.campaign;
          }
          if (operation === 'update') {
            const campaignId = this.getNodeParameter('campaignId', i) as string;
            const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
            const body: IDataObject = {
              ...updateFields,
            };
            responseData = await mauticApiRequest.call(
              this,
              'PATCH',
              `/campaigns/${campaignId}/edit`,
              body,
            );
            responseData = responseData.campaign;
          }
          if (operation === 'clone') {
            const campaignId = this.getNodeParameter('campaignId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/campaigns/${campaignId}/clone`,
            );
            responseData = responseData.campaign;
          }
          if (operation === 'get') {
            const campaignId = this.getNodeParameter('campaignId', i) as string;
            responseData = await mauticApiRequest.call(this, 'GET', `/campaigns/${campaignId}`);
            responseData = responseData.campaign;
          }
          if (operation === 'getAll') {
            const returnAll = this.getNodeParameter('returnAll', i) as boolean;
            const options = this.getNodeParameter('options', i) as IDataObject;
            qs = { ...options };
            // Patch: enforce default sort order by id ascending if not set by user
            if (!qs.orderBy) {
              qs.orderBy = 'id';
            }
            if (!qs.orderByDir) {
              qs.orderByDir = 'asc';
            }
            if (returnAll) {
              responseData = await mauticApiRequestAllItems.call(
                this,
                'campaigns',
                'GET',
                '/campaigns',
                {},
                qs,
              );
            } else {
              qs.limit = this.getNodeParameter('limit', i) as number;
              responseData = await mauticApiRequest.call(this, 'GET', '/campaigns', {}, qs);
              responseData = responseData.campaigns;
            }
          }
          if (operation === 'getContacts') {
            const campaignId = this.getNodeParameter('campaignId', i) as string;
            const returnAll = this.getNodeParameter('returnAll', i) as boolean;
            const options = this.getNodeParameter('options', i) as IDataObject;
            qs = { ...options };
            if (returnAll) {
              responseData = await mauticApiRequestAllItems.call(
                this,
                'contacts',
                'GET',
                `/campaigns/${campaignId}/contacts`,
                {},
                qs,
              );
            } else {
              qs.limit = this.getNodeParameter('limit', i) as number;
              responseData = await mauticApiRequest.call(
                this,
                'GET',
                `/campaigns/${campaignId}/contacts`,
                {},
                qs,
              );
              responseData = responseData.contacts;
            }
          }
          if (operation === 'delete') {
            const campaignId = this.getNodeParameter('campaignId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'DELETE',
              `/campaigns/${campaignId}/delete`,
            );
            responseData = responseData.campaign;
          }
        }
        if (resource === 'segment') {
          //https://developer.mautic.org/#segments
          if (operation === 'create') {
            const name = this.getNodeParameter('name', i) as string;
            const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
            const body: IDataObject = {
              name,
              ...additionalFields,
            };
            responseData = await mauticApiRequest.call(this, 'POST', '/segments/new', body);
            responseData = responseData.list;
          }
          if (operation === 'update') {
            const segmentId = this.getNodeParameter('segmentId', i) as string;
            const createIfNotFound = this.getNodeParameter('createIfNotFound', i) as boolean;
            const name = this.getNodeParameter('name', i) as string;
            const { ...additionalFields } = this.getNodeParameter(
              'additionalFields',
              i,
            ) as IDataObject;
            const body: IDataObject = {
              name,
              ...additionalFields,
            };

            const method = createIfNotFound ? 'PUT' : 'PATCH';
            responseData = await mauticApiRequest.call(
              this,
              method,
              `/segments/${segmentId}/edit`,
              body,
            );
            responseData = responseData.list;
          }
          if (operation === 'get') {
            const segmentId = this.getNodeParameter('segmentId', i) as string;
            responseData = await mauticApiRequest.call(this, 'GET', `/segments/${segmentId}`);
            responseData = responseData.list;
          }
          if (operation === 'getAll') {
            const returnAll = this.getNodeParameter('returnAll', i) as boolean;
            const options = this.getNodeParameter('options', i) as IDataObject;
            qs = { ...options };

            if (returnAll) {
              responseData = await mauticApiRequestAllItems.call(
                this,
                'lists',
                'GET',
                '/segments',
                {},
                qs,
              );
            } else {
              const limit = this.getNodeParameter('limit', i) as number;
              qs.limit = limit;
              responseData = await mauticApiRequest.call(this, 'GET', '/segments', {}, qs);
              responseData = responseData.lists ? Object.values(responseData.lists) : [];
            }
          }
          if (operation === 'delete') {
            const segmentId = this.getNodeParameter('segmentId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'DELETE',
              `/segments/${segmentId}/delete`,
            );
            responseData = responseData.list;
          }
          if (operation === 'addContact') {
            const segmentId = this.getNodeParameter('segmentId', i) as string;
            const contactId = this.getNodeParameter('contactId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/segments/${segmentId}/contact/${contactId}/add`,
            );
          }
          if (operation === 'removeContact') {
            const segmentId = this.getNodeParameter('segmentId', i) as string;
            const contactId = this.getNodeParameter('contactId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/segments/${segmentId}/contact/${contactId}/remove`,
            );
          }
          if (operation === 'addContacts') {
            const segmentId = this.getNodeParameter('segmentId', i) as string;
            let contactIds = this.getNodeParameter('contactIds', i, '') as string;
            if (!contactIds) {
              // Fallback: collect from all input items
              const ids = items
                .map((item) => item.json.contactId || item.json.id)
                .filter((id) => id !== undefined && id !== null && id !== '')
                .map((id) => String(id));
              contactIds = ids.join(',');
            }
            if (!contactIds) {
              throw new NodeOperationError(
                this.getNode(),
                'No contact IDs provided or found in input items.',
              );
            }
            const body = {
              ids: contactIds.split(','),
            };
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/segments/${segmentId}/contacts/add`,
              body,
            );
          }
        }
        if (resource === 'company') {
          //https://developer.mautic.org/#create-company
          if (operation === 'create') {
            const simple = this.getNodeParameter('simple', i) as boolean;
            const name = this.getNodeParameter('name', i) as string;
            const body: IDataObject = {
              companyname: name,
            };
            const {
              addressUi,
              customFieldsUi,
              companyEmail,
              fax,
              industry,
              numberOfEmpoyees,
              phone,
              website,
              annualRevenue,
              description,
              ...rest
            } = this.getNodeParameter('additionalFields', i) as {
              addressUi: {
                addressValues: IDataObject;
              };
              customFieldsUi: {
                customFieldValues: [
                  {
                    fieldId: string;
                    fieldValue: string;
                  },
                ];
              };
              companyEmail: string;
              fax: string;
              industry: string;
              numberOfEmpoyees: number;
              phone: string;
              website: string;
              annualRevenue: number;
              description: string;
            };
            if (addressUi?.addressValues) {
              const { addressValues } = addressUi;
              body.companyaddress1 = addressValues.address1 as string;
              body.companyaddress2 = addressValues.address2 as string;
              body.companycity = addressValues.city as string;
              body.companystate = addressValues.state as string;
              body.companycountry = addressValues.country as string;
              body.companyzipcode = addressValues.zipCode as string;
            }

            if (companyEmail) {
              body.companyemail = companyEmail;
            }

            if (fax) {
              body.companyfax = fax;
            }

            if (industry) {
              body.companyindustry = industry;
            }

            if (industry) {
              body.companyindustry = industry;
            }

            if (numberOfEmpoyees) {
              body.companynumber_of_employees = numberOfEmpoyees;
            }

            if (phone) {
              body.companyphone = phone;
            }

            if (website) {
              body.companywebsite = website;
            }

            if (annualRevenue) {
              body.companyannual_revenue = annualRevenue;
            }

            if (description) {
              body.companydescription = description;
            }

            if (customFieldsUi?.customFieldValues) {
              const { customFieldValues } = customFieldsUi;
              const data = customFieldValues.reduce(
                (obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }),
                {},
              );
              Object.assign(body, data);
            }

            Object.assign(body, rest);
            responseData = await mauticApiRequest.call(this, 'POST', '/companies/new', body);
            responseData = responseData.company;
            if (simple) {
              responseData = responseData.fields.all;
            }
          }
          //https://developer.mautic.org/#edit-company
          if (operation === 'update') {
            const companyId = this.getNodeParameter('companyId', i) as string;
            const simple = this.getNodeParameter('simple', i) as boolean;
            const body: IDataObject = {};
            const {
              addressUi,
              customFieldsUi,
              companyEmail,
              name,
              fax,
              industry,
              numberOfEmpoyees,
              phone,
              website,
              annualRevenue,
              description,
              ...rest
            } = this.getNodeParameter('updateFields', i) as {
              addressUi: {
                addressValues: IDataObject;
              };
              customFieldsUi: {
                customFieldValues: [
                  {
                    fieldId: string;
                    fieldValue: string;
                  },
                ];
              };
              companyEmail: string;
              name: string;
              fax: string;
              industry: string;
              numberOfEmpoyees: number;
              phone: string;
              website: string;
              annualRevenue: number;
              description: string;
            };
            if (addressUi?.addressValues) {
              const { addressValues } = addressUi;
              body.companyaddress1 = addressValues.address1 as string;
              body.companyaddress2 = addressValues.address2 as string;
              body.companycity = addressValues.city as string;
              body.companystate = addressValues.state as string;
              body.companycountry = addressValues.country as string;
              body.companyzipcode = addressValues.zipCode as string;
            }

            if (companyEmail) {
              body.companyemail = companyEmail;
            }

            if (name) {
              body.companyname = name;
            }

            if (fax) {
              body.companyfax = fax;
            }

            if (industry) {
              body.companyindustry = industry;
            }

            if (industry) {
              body.companyindustry = industry;
            }

            if (numberOfEmpoyees) {
              body.companynumber_of_employees = numberOfEmpoyees;
            }

            if (phone) {
              body.companyphone = phone;
            }

            if (website) {
              body.companywebsite = website;
            }

            if (annualRevenue) {
              body.companyannual_revenue = annualRevenue;
            }

            if (description) {
              body.companydescription = description;
            }

            if (customFieldsUi?.customFieldValues) {
              const { customFieldValues } = customFieldsUi;
              const data = customFieldValues.reduce(
                (obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }),
                {},
              );
              Object.assign(body, data);
            }

            Object.assign(body, rest);

            responseData = await mauticApiRequest.call(
              this,
              'PATCH',
              `/companies/${companyId}/edit`,
              body,
            );
            responseData = responseData.company;
            if (simple) {
              responseData = responseData.fields.all;
            }
          }
          //https://developer.mautic.org/#get-company
          if (operation === 'get') {
            const companyId = this.getNodeParameter('companyId', i) as string;
            const simple = this.getNodeParameter('simple', i) as boolean;
            responseData = await mauticApiRequest.call(this, 'GET', `/companies/${companyId}`);
            responseData = responseData.company;
            if (simple) {
              responseData = responseData.fields.all;
            }
          }
          //https://developer.mautic.org/#list-contact-companies
          if (operation === 'getAll') {
            const returnAll = this.getNodeParameter('returnAll', i);
            const simple = this.getNodeParameter('simple', i) as boolean;
            const additionalFields = this.getNodeParameter('additionalFields', i);
            qs = Object.assign(qs, additionalFields);
            // Patch: enforce default sort order by id ascending if not set by user
            if (!qs.orderBy) {
              qs.orderBy = 'id';
            }
            if (!qs.orderByDir) {
              qs.orderByDir = 'asc';
            }
            let limit: number | undefined = undefined;
            if (!returnAll) {
              limit = this.getNodeParameter('limit', i);
            }
            responseData = await mauticApiRequestAllItems.call(
              this,
              'companies',
              'GET',
              '/companies',
              {},
              qs,
              limit,
            );
            if (simple) {
              responseData = responseData.map((item: any) => item.fields.all);
            }
          }
          //https://developer.mautic.org/#delete-company
          if (operation === 'delete') {
            const simple = this.getNodeParameter('simple', i) as boolean;
            const companyId = this.getNodeParameter('companyId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'DELETE',
              `/companies/${companyId}/delete`,
            );
            responseData = responseData.company;
            if (simple) {
              responseData = responseData.fields.all;
            }
          }
        }

        if (resource === 'tag') {
          if (operation === 'create') {
            const body: IDataObject = {
              tag: this.getNodeParameter('tag', i) as string,
            };
            responseData = await mauticApiRequest.call(this, 'POST', '/tags/new', body);
            responseData = responseData.tag;
          }
          if (operation === 'update') {
            const tagId = this.getNodeParameter('tagId', i) as string;
            const createIfNotFound = this.getNodeParameter('createIfNotFound', i) as boolean;
            const { tag } = this.getNodeParameter('updateFields', i) as {
              tag: string;
            };
            const body: IDataObject = {};
            if (tag) body.tag = tag;

            const method = createIfNotFound ? 'PUT' : 'PATCH';

            responseData = await mauticApiRequest.call(this, method, `/tags/${tagId}/edit`, body);
            responseData = responseData.tag;
          }
          if (operation === 'get') {
            const tagId = this.getNodeParameter('tagId', i) as string;
            responseData = await mauticApiRequest.call(this, 'GET', `/tags/${tagId}`);
            responseData = responseData.tag;
          }
          if (operation === 'getAll') {
            const returnAll = this.getNodeParameter('returnAll', i) as boolean;
            const options = this.getNodeParameter('options', i) as IDataObject;
            Object.assign(qs, options);
            // Patch: enforce default sort order by id ascending if not set by user
            if (!qs.orderBy) {
              qs.orderBy = 'id';
            }
            if (!qs.orderByDir) {
              qs.orderByDir = 'asc';
            }
            let limit: number | undefined = undefined;
            if (!returnAll) {
              limit = this.getNodeParameter('limit', i) as number;
            }
            responseData = await mauticApiRequestAllItems.call(
              this,
              'tags',
              'GET',
              '/tags',
              {},
              qs,
              limit,
            );
          }
          if (operation === 'delete') {
            const tagId = this.getNodeParameter('tagId', i) as string;
            responseData = await mauticApiRequest.call(this, 'DELETE', `/tags/${tagId}/delete`);
            responseData = responseData.tag;
          }
        }

        if (resource === 'contact') {
          //https://developer.mautic.org/?php#create-contact
          if (operation === 'create') {
            const options = this.getNodeParameter('options', i);
            const additionalFields = this.getNodeParameter('additionalFields', i);
            const jsonActive = this.getNodeParameter('jsonParameters', i);
            let body: IDataObject = {};
            if (!jsonActive) {
              body.email = this.getNodeParameter('email', i) as string;
              body.firstname = this.getNodeParameter('firstName', i) as string;
              body.lastname = this.getNodeParameter('lastName', i) as string;
              body.company = this.getNodeParameter('company', i) as string;
              body.position = this.getNodeParameter('position', i) as string;
              body.title = this.getNodeParameter('title', i) as string;
            } else {
              const json = validateJSON(this.getNodeParameter('bodyJson', i) as string);
              if (json !== undefined) {
                body = { ...json };
              } else {
                throw new NodeOperationError(this.getNode(), 'Invalid JSON', { itemIndex: i });
              }
            }
            if (additionalFields.ipAddress) {
              body.ipAddress = additionalFields.ipAddress as string;
            }
            if (additionalFields.lastActive) {
              body.lastActive = additionalFields.lastActive as string;
            }
            if (additionalFields.ownerId) {
              body.owner = additionalFields.ownerId as string;
            }
            if (additionalFields.addressUi) {
              const addressValues = (additionalFields.addressUi as IDataObject)
                .addressValues as IDataObject;
              if (addressValues) {
                body.address1 = addressValues.address1 as string;
                body.address2 = addressValues.address2 as string;
                body.city = addressValues.city as string;
                body.state = addressValues.state as string;
                body.country = addressValues.country as string;
                body.zipcode = addressValues.zipCode as string;
              }
            }
            if (additionalFields.socialMediaUi) {
              const socialMediaValues = (additionalFields.socialMediaUi as IDataObject)
                .socialMediaValues as IDataObject;
              if (socialMediaValues) {
                body.facebook = socialMediaValues.facebook as string;
                body.foursquare = socialMediaValues.foursquare as string;
                body.instagram = socialMediaValues.instagram as string;
                body.linkedin = socialMediaValues.linkedIn as string;
                body.skype = socialMediaValues.skype as string;
                body.twitter = socialMediaValues.twitter as string;
              }
            }
            if (additionalFields.customFieldsUi) {
              const customFields = (additionalFields.customFieldsUi as IDataObject)
                .customFieldValues as IDataObject[];
              if (customFields) {
                const data = customFields.reduce(
                  (obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }),
                  {},
                );
                Object.assign(body, data);
              }
            }
            if (additionalFields.b2bOrb2c) {
              body.b2b_or_b2c = additionalFields.b2bOrb2c as string;
            }
            if (additionalFields.crmId) {
              body.crm_id = additionalFields.crmId as string;
            }
            if (additionalFields.fax) {
              body.fax = additionalFields.fax as string;
            }
            if (additionalFields.hasPurchased) {
              body.haspurchased = additionalFields.hasPurchased as boolean;
            }
            if (additionalFields.mobile) {
              body.mobile = additionalFields.mobile as string;
            }
            if (additionalFields.phone) {
              body.phone = additionalFields.phone as string;
            }
            if (additionalFields.prospectOrCustomer) {
              body.prospect_or_customer = additionalFields.prospectOrCustomer as string;
            }
            if (additionalFields.sandbox) {
              body.sandbox = additionalFields.sandbox as boolean;
            }
            if (additionalFields.stage) {
              body.stage = additionalFields.stage as string;
            }
            if (additionalFields.tags) {
              body.tags = additionalFields.tags as string;
            }
            if (additionalFields.website) {
              body.website = additionalFields.website as string;
            }
            responseData = await mauticApiRequest.call(this, 'POST', '/contacts/new', body);
            responseData = [responseData.contact];
            if (options.rawData === false) {
              responseData = responseData.map((item) => item.fields.all);
            }
          }
          //https://developer.mautic.org/?php#edit-contact
          if (operation === 'update') {
            const options = this.getNodeParameter('options', i);
            const updateFields = this.getNodeParameter('updateFields', i);
            const contactId = this.getNodeParameter('contactId', i) as string;
            let body: IDataObject = {};
            if (updateFields.email) {
              body.email = updateFields.email as string;
            }
            if (updateFields.firstName) {
              body.firstname = updateFields.firstName as string;
            }
            if (updateFields.lastName) {
              body.lastname = updateFields.lastName as string;
            }
            if (updateFields.company) {
              body.company = updateFields.company as string;
            }
            if (updateFields.position) {
              body.position = updateFields.position as string;
            }
            if (updateFields.title) {
              body.title = updateFields.title as string;
            }
            if (updateFields.bodyJson) {
              const json = validateJSON(updateFields.bodyJson as string);
              if (json !== undefined) {
                body = { ...json };
              } else {
                throw new NodeOperationError(this.getNode(), 'Invalid JSON', { itemIndex: i });
              }
            }
            if (updateFields.ipAddress) {
              body.ipAddress = updateFields.ipAddress as string;
            }
            if (updateFields.lastActive) {
              body.lastActive = updateFields.lastActive as string;
            }
            if (updateFields.ownerId) {
              body.owner = updateFields.ownerId as string;
            }
            if (updateFields.addressUi) {
              const addressValues = (updateFields.addressUi as IDataObject)
                .addressValues as IDataObject;
              if (addressValues) {
                body.address1 = addressValues.address1 as string;
                body.address2 = addressValues.address2 as string;
                body.city = addressValues.city as string;
                body.state = addressValues.state as string;
                body.country = addressValues.country as string;
                body.zipcode = addressValues.zipCode as string;
              }
            }
            if (updateFields.socialMediaUi) {
              const socialMediaValues = (updateFields.socialMediaUi as IDataObject)
                .socialMediaValues as IDataObject;
              if (socialMediaValues) {
                body.facebook = socialMediaValues.facebook as string;
                body.foursquare = socialMediaValues.foursquare as string;
                body.instagram = socialMediaValues.instagram as string;
                body.linkedin = socialMediaValues.linkedIn as string;
                body.skype = socialMediaValues.skype as string;
                body.twitter = socialMediaValues.twitter as string;
              }
            }
            if (updateFields.customFieldsUi) {
              const customFields = (updateFields.customFieldsUi as IDataObject)
                .customFieldValues as IDataObject[];
              if (customFields) {
                const data = customFields.reduce(
                  (obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }),
                  {},
                );
                Object.assign(body, data);
              }
            }
            if (updateFields.b2bOrb2c) {
              body.b2b_or_b2c = updateFields.b2bOrb2c as string;
            }
            if (updateFields.crmId) {
              body.crm_id = updateFields.crmId as string;
            }
            if (updateFields.fax) {
              body.fax = updateFields.fax as string;
            }
            if (updateFields.hasPurchased) {
              body.haspurchased = updateFields.hasPurchased as boolean;
            }
            if (updateFields.mobile) {
              body.mobile = updateFields.mobile as string;
            }
            if (updateFields.phone) {
              body.phone = updateFields.phone as string;
            }
            if (updateFields.prospectOrCustomer) {
              body.prospect_or_customer = updateFields.prospectOrCustomer as string;
            }
            if (updateFields.sandbox) {
              body.sandbox = updateFields.sandbox as boolean;
            }
            if (updateFields.stage) {
              body.stage = updateFields.stage as string;
            }
            if (updateFields.tags) {
              body.tags = updateFields.tags as string;
            }
            if (updateFields.website) {
              body.website = updateFields.website as string;
            }
            responseData = await mauticApiRequest.call(
              this,
              'PATCH',
              `/contacts/${contactId}/edit`,
              body,
            );
            responseData = [responseData.contact];
            if (options.rawData === false) {
              responseData = responseData.map((item) => item.fields.all);
            }
          }
          //https://developer.mautic.org/?php#get-contact
          if (operation === 'get') {
            const options = this.getNodeParameter('options', i);
            const contactId = this.getNodeParameter('contactId', i) as string;
            responseData = await mauticApiRequest.call(this, 'GET', `/contacts/${contactId}`);
            responseData = [responseData.contact];
            if (options.rawData === false) {
              responseData = responseData.map((item) => item.fields.all);
              // Filter fields if fieldsToReturn is set
              if (Array.isArray(options.fieldsToReturn) && options.fieldsToReturn.length > 0) {
                responseData = responseData.map((item: any) => {
                  const filtered: Record<string, any> = {};
                  for (const field of options.fieldsToReturn as string[]) {
                    if (Object.prototype.hasOwnProperty.call(item, field)) {
                      filtered[field] = item[field];
                    }
                  }
                  return filtered;
                });
              }
            }
          }
          //https://developer.mautic.org/?php#list-contacts
          if (operation === 'getAll') {
            const returnAll = this.getNodeParameter('returnAll', i);
            const options = this.getNodeParameter('options', i);
            qs = Object.assign(qs, options);
            // Patch: enforce default sort order by id ascending if not set by user
            if (!qs.orderBy) {
              qs.orderBy = 'id';
            }
            if (!qs.orderByDir) {
              qs.orderByDir = 'asc';
            }
            if (qs.orderBy) {
              qs.orderBy = snakeCase(qs.orderBy as string);
            }

            // Advanced where support
            const whereObj = options.where as IDataObject;
            let filteredWhere: any[] = [];
            if (whereObj && Array.isArray(whereObj.conditions)) {
              // Only keep non-empty conditions in the API query
              filteredWhere = whereObj.conditions;
              if (filteredWhere.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { serialiseMauticWhere } = require('./GenericFunctions');
                const whereParams = serialiseMauticWhere(filteredWhere);
                Object.assign(qs, whereParams);
              }
              // Remove the original 'where' to avoid sending as JSON
              delete qs.where;
            }

            let limit: number | undefined = undefined;
            if (!returnAll) {
              limit = this.getNodeParameter('limit', i);
            }

            // In contact:getAll, after fetching allContacts, apply post-filtering if any DNC boolean option is true
            const emailDncOnly = options.emailDncOnly === true;
            const smsDncOnly = options.smsDncOnly === true;
            const anyDncOnly = options.anyDncOnly === true;
            const useDncPostFilter = emailDncOnly || smsDncOnly || anyDncOnly;

            if (useDncPostFilter) {
              let filteredContacts: any[] = [];
              let page = 0;
              const pageSize = 100;
              const moreData = true;
              while (moreData) {
                const pagedQs = { ...qs, limit: pageSize, start: page * pageSize };
                const pageData = await mauticApiRequest.call(this, 'GET', '/contacts', {}, pagedQs);
                let contacts: any[] = [];
                if (pageData.contacts) {
                  contacts = Object.values(pageData.contacts) as any[];
                }
                if (!contacts.length) break;
                // Filter DNC contacts from this page and add to filteredContacts
                const dncMatches = contacts.filter((contact) => {
                  if (!contact.doNotContact || !Array.isArray(contact.doNotContact)) return false;
                  if (anyDncOnly) {
                    return contact.doNotContact.length > 0;
                  } else if (emailDncOnly) {
                    return contact.doNotContact.some((dnc: any) => dnc.channel === 'email');
                  } else if (smsDncOnly) {
                    return contact.doNotContact.some((dnc: any) => dnc.channel === 'sms');
                  }
                  return false;
                });
                filteredContacts = filteredContacts.concat(dncMatches);
                // Stop if we have enough DNC matches
                if (!returnAll && filteredContacts.length >= (limit || 0)) break;
                if (contacts.length < pageSize) break;
                page++;
              }
              if (!returnAll && limit) {
                filteredContacts = filteredContacts.slice(0, limit);
              }
              responseData = filteredContacts;
            } else {
              // No DNC filter, fetch as usual
              responseData = await mauticApiRequestAllItems.call(
                this,
                'contacts',
                'GET',
                '/contacts',
                {},
                qs,
                limit,
              );
            }
            if (options.rawData === false) {
              responseData = responseData.map((item: any) => item.fields.all);
              // Filter fields if fieldsToReturn is set
              if (Array.isArray(options.fieldsToReturn) && options.fieldsToReturn.length > 0) {
                responseData = responseData.map((item: any) => {
                  const filtered: Record<string, any> = {};
                  for (const field of options.fieldsToReturn as string[]) {
                    if (Object.prototype.hasOwnProperty.call(item, field)) {
                      filtered[field] = item[field];
                    }
                  }
                  return filtered;
                });
              }
            }
          }
          //https://developer.mautic.org/?php#delete-contact
          if (operation === 'delete') {
            const options = this.getNodeParameter('options', i);
            const contactId = this.getNodeParameter('contactId', i) as string;
            try {
              responseData = await mauticApiRequest.call(
                this,
                'DELETE',
                `/contacts/${contactId}/delete`,
              );
              // Mautic API may return 200 with no 'contact' property or empty body on successful delete
              if (responseData && responseData.contact !== undefined) {
                responseData = [responseData.contact];
              } else {
                // Return a success message to indicate successful deletion
                responseData = [{ success: true, message: 'Contact deleted successfully.' }];
              }
            } catch (error) {
              // If the error is a 404 (not found), treat as successful delete (idempotent)
              if (error instanceof NodeApiError && error.httpCode === '404') {
                responseData = [
                  { success: true, message: 'Contact already deleted or not found.' },
                ];
              } else {
                throw error;
              }
            }
            if (options.rawData === false) {
              responseData = responseData.map((item) => item.fields?.all ?? item);
            }
          }
          //https://developer.mautic.org/#send-email-to-contact
          if (operation === 'sendEmail') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const campaignEmailId = this.getNodeParameter('campaignEmailId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/emails/${campaignEmailId}/contact/${contactId}/send`,
            );
          }
          //https://developer.mautic.org/#add-do-not-contact
          //https://developer.mautic.org/#remove-from-do-not-contact
          if (operation === 'editDoNotContactList') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const action = this.getNodeParameter('action', i) as string;
            const channel = this.getNodeParameter('channel', i) as string;
            const body: IDataObject = {};
            if (action === 'add') {
              const additionalFields = this.getNodeParameter('additionalFields', i);
              Object.assign(body, additionalFields);
            }
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/contacts/${contactId}/dnc/${channel}/${action}`,
              body,
            );
            responseData = responseData.contact;
          }

          //https://developer.mautic.org/#add-points
          //https://developer.mautic.org/#subtract-points
          if (operation === 'editContactPoint') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const action = this.getNodeParameter('action', i) as string;
            const points = this.getNodeParameter('points', i) as string;
            const path = action === 'add' ? 'plus' : 'minus';
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/contacts/${contactId}/points/${path}/${points}`,
            );
          }

          //https://developer.mautic.org/#add-utm-tags
          if (operation === 'addUtm') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const utmFields = this.getNodeParameter('utmFields', i) as IDataObject;
            const body: IDataObject = {};

            if (utmFields.utmCampaign) body.utm_campaign = utmFields.utmCampaign;
            if (utmFields.utmSource) body.utm_source = utmFields.utmSource;
            if (utmFields.utmMedium) body.utm_medium = utmFields.utmMedium;
            if (utmFields.utmContent) body.utm_content = utmFields.utmContent;
            if (utmFields.utmTerm) body.utm_term = utmFields.utmTerm;
            if (utmFields.userAgent) body.useragent = utmFields.userAgent;
            if (utmFields.url) body.url = utmFields.url;
            if (utmFields.referer) body.referer = utmFields.referer;
            if (utmFields.query) body.query = utmFields.query;
            if (utmFields.remoteHost) body.remotehost = utmFields.remoteHost;
            if (utmFields.lastActive) body.lastActive = utmFields.lastActive;

            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/contacts/${contactId}/utm/add`,
              body,
            );
            responseData = responseData.contact;
          }

          //https://developer.mautic.org/#remove-utm-tags-from-a-contact
          if (operation === 'removeUtm') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const utmId = this.getNodeParameter('utmId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/contacts/${contactId}/utm/${utmId}/remove`,
            );
            responseData = responseData.contact;
          }

          //https://developer.mautic.org/#get-contacts-devices
          if (operation === 'getDevices') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            responseData = await mauticApiRequestAllItems.call(
              this,
              'devices',
              'GET',
              `/contacts/${contactId}/devices`,
            );
          }

          //https://developer.mautic.org/#get-activity-events-for-specific-contact
          if (operation === 'getActivity') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const options = this.getNodeParameter('options', i) as IDataObject;

            const filters: IDataObject = {};
            if (options.search) filters.search = options.search;
            if (options.includeEvents)
              filters.includeEvents = (options.includeEvents as string).split(',');
            if (options.excludeEvents)
              filters.excludeEvents = (options.excludeEvents as string).split(',');
            if (options.dateFrom) filters.dateFrom = options.dateFrom;
            if (options.dateTo) filters.dateTo = options.dateTo;

            qs['filters'] = filters;
            if (options.orderBy) qs.order = [options.orderBy, options.orderByDir ?? 'asc'];
            if (options.limit) qs.limit = options.limit;

            responseData = await mauticApiRequestAllItems.call(
              this,
              'events',
              'GET',
              `/contacts/${contactId}/activity`,
              {},
              qs,
            );
          }

          //https://developer.mautic.org/#list-contact-notes
          if (operation === 'getNotes') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const options = this.getNodeParameter('options', i) as IDataObject;
            qs = options;
            responseData = await mauticApiRequestAllItems.call(
              this,
              'notes',
              'GET',
              `/contacts/${contactId}/notes`,
              {},
              qs,
            );
          }

          //https://developer.mautic.org/#get-contacts-companies
          if (operation === 'getCompanies') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            responseData = await mauticApiRequestAllItems.call(
              this,
              'companies',
              'GET',
              `/contacts/${contactId}/companies`,
            );
          }
        }

        if (resource === 'contactSegment') {
          //https://developer.mautic.org/?php#add-contact-to-a-segment
          if (operation === 'add') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const segmentId = this.getNodeParameter('segmentId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/segments/${segmentId}/contact/${contactId}/add`,
            );
          }
          //https://developer.mautic.org/#remove-contact-from-a-segment
          if (operation === 'remove') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const segmentId = this.getNodeParameter('segmentId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/segments/${segmentId}/contact/${contactId}/remove`,
            );
          }
        }

        if (resource === 'campaignContact') {
          //https://developer.mautic.org/#add-contact-to-a-campaign
          if (operation === 'add') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const campaignId = this.getNodeParameter('campaignId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/campaigns/${campaignId}/contact/${contactId}/add`,
            );
          }
          //https://developer.mautic.org/#remove-contact-from-a-campaign
          if (operation === 'remove') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const campaignId = this.getNodeParameter('campaignId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/campaigns/${campaignId}/contact/${contactId}/remove`,
            );
          }
        }

        if (resource === 'segmentEmail') {
          //https://developer.mautic.org/#send-email-to-segment
          if (operation === 'send') {
            const segmentEmailId = this.getNodeParameter('segmentEmailId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/emails/${segmentEmailId}/send`,
            );
          }
        }

        if (resource === 'companyContact') {
          //https://developer.mautic.org/#add-contact-to-a-company
          if (operation === 'add') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const companyId = this.getNodeParameter('companyId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/companies/${companyId}/contact/${contactId}/add`,
              {},
            );
            // responseData = responseData.company;
            // if (simple === true) {
            //   responseData = responseData.fields.all;
            // }
          }
          //https://developer.mautic.org/#remove-contact-from-a-company
          if (operation === 'remove') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const companyId = this.getNodeParameter('companyId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'POST',
              `/companies/${companyId}/contact/${contactId}/remove`,
              {},
            );
            // responseData = responseData.company;
            // if (simple === true) {
            //   responseData = responseData.fields.all;
            // }
          }
        }

        if (resource === 'category') {
          if (operation === 'create') {
            const body: IDataObject = {
              title: this.getNodeParameter('title', i) as string,
              bundle: this.getNodeParameter('bundle', i) as string,
            };
            const description = this.getNodeParameter('description', i, '') as string;
            if (description) {
              body.description = description;
            }
            const color = this.getNodeParameter('color', i, '') as string;
            if (color) {
              body.color = color;
            }
            responseData = await mauticApiRequest.call(this, 'POST', '/categories/new', body);
            responseData = responseData.category;
          }
          if (operation === 'update') {
            const categoryId = this.getNodeParameter('categoryId', i) as string;
            const { title, description, color } = this.getNodeParameter('updateFields', i) as {
              title: string;
              description: string;
              color: string;
            };
            const body: IDataObject = {};
            if (title) body.title = title;
            if (description) body.description = description;
            if (color) body.color = color;

            responseData = await mauticApiRequest.call(
              this,
              'PATCH',
              `/categories/${categoryId}/edit`,
              body,
            );
            responseData = responseData.category;
          }
          if (operation === 'get') {
            const categoryId = this.getNodeParameter('categoryId', i) as string;
            responseData = await mauticApiRequest.call(this, 'GET', `/categories/${categoryId}`);
            responseData = responseData.category;
          }
          if (operation === 'getAll') {
            const returnAll = this.getNodeParameter('returnAll', i) as boolean;
            const options = this.getNodeParameter('options', i) as IDataObject;
            Object.assign(qs, options);
            // Patch: enforce default sort order by id ascending if not set by user
            if (!qs.orderBy) {
              qs.orderBy = 'id';
            }
            if (!qs.orderByDir) {
              qs.orderByDir = 'asc';
            }
            let limit: number | undefined = undefined;
            if (!returnAll) {
              limit = this.getNodeParameter('limit', i) as number;
            }
            responseData = await mauticApiRequestAllItems.call(
              this,
              'categories',
              'GET',
              '/categories',
              {},
              qs,
              limit,
            );
          }
          if (operation === 'delete') {
            const categoryId = this.getNodeParameter('categoryId', i) as string;
            responseData = await mauticApiRequest.call(
              this,
              'DELETE',
              `/categories/${categoryId}/delete`,
            );
            responseData = responseData.category;
          }
        }

        if (Array.isArray(responseData)) {
          returnData.push(...this.helpers.returnJsonArray(responseData));
        } else {
          returnData.push(...this.helpers.returnJsonArray([responseData as IDataObject]));
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push(...this.helpers.returnJsonArray([{ error: (error as Error).message }]));
          continue;
        }
        throw error;
      }
    }
    return [returnData];
  }
}
