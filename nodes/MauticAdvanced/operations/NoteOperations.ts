import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  handleApiError,
  makeApiRequest,
  makePaginatedRequest,
  getOptionalParam,
  getRequiredParam,
} from '../utils/ApiHelpers';
import { buildQueryFromOptions, wrapSingleItem, convertNumericStrings } from '../utils/DataHelpers';

export async function executeNoteOperation(
  context: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: any;
  try {
    switch (operation) {
      case 'create':
        responseData = await createNote(context, i);
        break;
      case 'update':
        responseData = await updateNote(context, i);
        break;
      case 'get':
        responseData = await getNote(context, i);
        break;
      case 'getAll':
        responseData = await getAllNotes(context, i);
        break;
      case 'delete':
        responseData = await deleteNote(context, i);
        break;
      default:
        throw new NodeOperationError(
          context.getNode(),
          `Operation '${operation}' is not supported for Note resource.`,
          { itemIndex: i },
        );
    }
    return context.helpers.returnJsonArray(wrapSingleItem(responseData));
  } catch (error) {
    return handleApiError(context, error, operation, 'Note');
  }
}

async function createNote(context: IExecuteFunctions, itemIndex: number): Promise<any> {
  const lead = getRequiredParam<string>(context, 'lead', itemIndex);
  const text = getRequiredParam<string>(context, 'text', itemIndex);
  const type = getOptionalParam<string>(context, 'type', itemIndex, 'general');
  const datetime = getOptionalParam<string>(context, 'datetime', itemIndex, '');

  const body: any = {
    lead,
    text,
    type,
  };

  if (datetime) {
    body.datetime = datetime;
  }

  const endpoint = '/notes/new';
  const response = await makeApiRequest(context, 'POST', endpoint, body);
  return response.note;
}

async function updateNote(context: IExecuteFunctions, itemIndex: number): Promise<any> {
  const noteId = getRequiredParam<string>(context, 'noteId', itemIndex);
  const createIfNotFound = getOptionalParam<boolean>(context, 'createIfNotFound', itemIndex, false);
  const updateFields = getOptionalParam<any>(context, 'updateFields', itemIndex, {});

  const body: any = {};

  if (updateFields.text !== undefined) {
    body.text = updateFields.text;
  }

  if (updateFields.type !== undefined) {
    body.type = updateFields.type;
  }

  if (updateFields.datetime !== undefined) {
    body.datetime = updateFields.datetime;
  }

  const endpoint = `/notes/${noteId}/edit`;
  const method = createIfNotFound ? 'PUT' : 'PATCH';
  const response = await makeApiRequest(context, method, endpoint, body);
  return response.note;
}

async function getNote(context: IExecuteFunctions, itemIndex: number): Promise<any> {
  const noteId = getRequiredParam<string>(context, 'noteId', itemIndex);

  const endpoint = `/notes/${noteId}`;
  const response = await makeApiRequest(context, 'GET', endpoint);
  return convertNumericStrings(response.note);
}

async function getAllNotes(context: IExecuteFunctions, itemIndex: number): Promise<any[]> {
  const returnAll = getOptionalParam<boolean>(context, 'returnAll', itemIndex, false);
  const limit = getOptionalParam<number>(context, 'limit', itemIndex, 50);
  const options = getOptionalParam<any>(context, 'options', itemIndex, {});

  const query = buildQueryFromOptions(options);

  if (returnAll) {
    const result = await makePaginatedRequest(context, 'notes', 'GET', '/notes', {}, query);
    return convertNumericStrings(result);
  } else {
    query.limit = limit;
    const response = await makeApiRequest(context, 'GET', '/notes', {}, query);
    const data = Object.values(response.notes || {});
    return convertNumericStrings(data);
  }
}

async function deleteNote(context: IExecuteFunctions, itemIndex: number): Promise<any> {
  const noteId = getRequiredParam<string>(context, 'noteId', itemIndex);

  const endpoint = `/notes/${noteId}/delete`;
  const response = await makeApiRequest(context, 'DELETE', endpoint);
  return response.note;
}
