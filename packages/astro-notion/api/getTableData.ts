import { getNotionClient, getDatabaseId } from './notionClient';
import { getPlainText, getPostDate } from './utils';
import {
  GetDatabaseResponse,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints';

// Get metadata of the database eg. title, date
// returns the database object as response
export async function getTableHeader(): Promise<GetDatabaseResponse> {
  try {
    const databaseId = getDatabaseId();
    const notion = getNotionClient();
    const response = await notion.databases.retrieve({
      database_id: databaseId,
    });

    return response;
  } catch (error) {
    console.error(error);
  }
}

type tableProps = {
  includeDraft?: boolean;
};

// Takes props for filtering options
// Returns contents in the database
// by default, it does not include the draft posts
export async function getTableData(
  props: tableProps = { includeDraft: false }
) {
  try {
    const { includeDraft } = props;
    const databaseId = getDatabaseId();
    const notion = getNotionClient();

    // this filters out the draft posts by default
    const queryObj = {
      database_id: databaseId,
      ...(!includeDraft && {
        filter: {
          property: 'draft',
          checkbox: {
            does_not_equal: true,
          },
        },
      }),
    };

    const response = await notion.databases.query(queryObj);
    const cleanedData = cleanTableData(response.results);
    return cleanedData;
  } catch (error) {
    console.error(error);
  }
}

type pageMetaData = {
  id: string;
  url: string;
  date: {
    created: string;
    edited: string;
  };
  properties: {
    title: number;
    slug: string;
    tags: { name: string, color: string; }[];
    color: string;
    icon: string;
  };
};

function cleanTableData(data): pageMetaData[] | [] {
  if (!data) {
    return [];
  }

  const cleanedData = data.map((page): pageMetaData => {
    const { id, created_time, last_edited_time, properties, url } = page;
    const tags = page.properties.tags.multi_select.map(({ name, color }) => ({ name, color }));

    return {
      id,
      url,
      date: getPostDate(created_time, last_edited_time, properties?.date),
      properties: {
        title: getPlainText(properties?.title),
        slug: getPlainText(properties?.slug),
        tags,
        color: tags.map(({ color }) => color)[0],
        icon: page.icon?.emoji,
      },
    };
  });

  return cleanedData;
}
