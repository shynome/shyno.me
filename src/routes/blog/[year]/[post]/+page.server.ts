import type { ServerLoad } from '@sveltejs/kit';

import { blogRoot } from '$lib/config';
import path from 'path';
import MarkdownIt from 'markdown-it';
import fs from 'fs/promises';
import fm from 'front-matter';

const md = MarkdownIt();

export interface Data {
	content: string;
	attrs: any;
	stat: {
		ctime: Date;
		mtime: Date;
	};
}

export const load: ServerLoad = async ({ params }) => {
	let file = path.join(blogRoot, params.year!, params.post!);
	let content = await fs.readFile(file, 'utf8');
	let r = fm(content);
	let stat = await fs.stat(file);
	return {
		content: md.render(r.body),
		attrs: r.attributes,
		stat: {
			ctime: stat.ctime,
			mtime: stat.mtime,
		},
	};
};
