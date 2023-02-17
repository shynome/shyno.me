import type { ServerLoad } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { blogRoot } from '$lib/config';

export type Data = {
	years: string[];
	[k: string]: string[];
};

export const load: ServerLoad = async (): Promise<Data> => {
	let dirs = await fs.readdir(blogRoot);
	dirs = dirs.filter((v) => !v.startsWith('.'));
	let articlesOfYear = dirs.reduce((target, year) => {
		target[year] = Promise.resolve().then(async () => {
			let dir = path.join(blogRoot, year);
			let dirs = await fs.readdir(dir);
			return dirs;
		});
		return target;
	}, {} as { [k: string]: Promise<string[]> });
	return {
		years: dirs,
		...articlesOfYear,
	};
};
