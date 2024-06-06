import type { TPagination, TQueryTable } from '../@types';
import { countedRows } from '../db/db-query/post.query';

export const pagination = async <T>(page : string, limit : string, table : TQueryTable<T>) : Promise<{ results : TPagination, startIndex: number, limitNumber: number }> => {
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = pageNumber * limitNumber;

    const results = <TPagination>{};
    const counted = await countedRows(table);
    endIndex < counted ? results.next = {page : pageNumber + 1, limit : limitNumber} : undefined;
    startIndex > 0 ? results.previous = {page : pageNumber - 1, limit : limitNumber} : undefined;

    return {results, startIndex, limitNumber};
}