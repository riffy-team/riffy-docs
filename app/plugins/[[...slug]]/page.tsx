import { notFound } from 'next/navigation'
import { compileMdx } from 'nextra/compile'
import { Callout, Tabs } from 'nextra/components'
import { evaluate } from 'nextra/evaluate'
import {
	convertToPageMap,
	mergeMetaWithPageMap,
	normalizePageMap
} from 'nextra/page-map'
import { useMDXComponents as getMDXComponents } from '../../../mdx-components'

const remotes = {
	'riffy-spotify': {
		user: 'riffy-team',
		repo: 'riffy-spotify',
		branch: 'main',
		docsPath: '',
		filePaths: ['README.md']
	},
	'commandkit-plugin-riffy': {
		user: 'BebanCode',
		repo: 'commandkit-plugin-riffy',
		branch: 'master',
		docsPath: '',
		filePaths: ['README.md']
	}
	// Add more remotes here as 'repo-name': { ... }
}

const mdxPages = {}
const pageMapItems = []

function updateRoutes(items, parentRoute) {
	return items.map(item => {
		let currentItemRoute = item.route;
		const parentRouteSegments = parentRoute.split('/').filter(Boolean);
		const lastParentSegment = parentRouteSegments[parentRouteSegments.length - 1];

		console.dir({ currentItemRoute, parentRouteSegments, lastParentSegment })
		if (lastParentSegment && currentItemRoute.startsWith(`/${lastParentSegment}`)) {

			console.log("currentItemRoute & lastParentSegement same check", currentItemRoute, lastParentSegment);
			currentItemRoute = currentItemRoute.substring(lastParentSegment.length + 1);
			console.log("[final - result ] currentItemRoute & lastParentSegement same check", currentItemRoute, lastParentSegment);
		}

		if (currentItemRoute.startsWith('/')) {
			console.log("startWith check", currentItemRoute);
			currentItemRoute = currentItemRoute.substring(1);

			console.log("startWith check result", currentItemRoute);
		}
		const newRoute = `${parentRoute}/${currentItemRoute}`.replace(/\/\/+/g, '/');

		const updatedItem = {
			...item,
			route: newRoute,
			title: item.title || item.name.replace(/\.mdx?$/, '').replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
		};
		console.log(updatedItem)
		if (item.children) {
			updatedItem.children = updateRoutes(item.children, newRoute);
			updatedItem.type = 'menu';
		}
		return updatedItem;
	});
}

for (const repo in remotes) {
	const remote = remotes[repo]
	const { mdxPages: remoteMdxPages, pageMap: _pageMap } = convertToPageMap({
		filePaths: remote.filePaths,
		basePath: repo
	})

	for (const key in remoteMdxPages) {
		mdxPages[`${repo}/${key.replace(/\/index$/, '')}`] = remoteMdxPages[key]
	}

	if (_pageMap.length > 0) {
		const rootPluginItem = _pageMap[0];
		const pluginRootRoute = `/plugins/${repo}`;

		console.log(_pageMap)
		const isReadmeIndex = _pageMap.length === 1 && (rootPluginItem?.children?.length === 1 && rootPluginItem.children[0].name === 'README');
		console.log(isReadmeIndex, rootPluginItem)

		const finalPluginItem = {
			...rootPluginItem,
			name: repo,
			route: pluginRootRoute,
			title: repo.split('-').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' '),
			type: isReadmeIndex ? 'page' : 'menu',
		};

		if (!isReadmeIndex && rootPluginItem.children) {
			finalPluginItem.children = updateRoutes(rootPluginItem.children, pluginRootRoute);
		} else if (isReadmeIndex) {
			delete finalPluginItem.children
		}

		console.log(finalPluginItem)
		pageMapItems.push(finalPluginItem);
	}
}

export const pageMap = pageMapItems

const { wrapper: Wrapper, ...components } = getMDXComponents({
	$Tabs: Tabs,
	Callout
})

type PageProps = Readonly<{
	params: Promise<{
		slug?: string[]
	}>
}>

export default async function Page(props: PageProps) {
	const params = await props.params
	const route = params.slug?.join('/') ?? ''
	const [repoName, ...filePathParts] = params.slug
	const filePathName = filePathParts.join('/') || 'index'
	const finalRoute = filePathParts.length === 0 ? `${route}/README` : route
	const filePath = mdxPages[finalRoute]


	console.log({ filePathParts, filePath, filePathName, route, repoName, mdxPages })
	if (!filePath) {
		notFound()
	}

	const remote = remotes[repoName]
	if (!remote) {
		notFound()
	}

	const { user, repo, branch, docsPath } = remote

	const response = await fetch(
		`https://raw.githubusercontent.com/${user}/${repo}/${branch}/${docsPath ? docsPath + '/' : ''
		}${filePath}`
	)
	console.log(response.status)
	const data = await response.text()
	const rawJs = await compileMdx(data, { filePath })
	const { default: MDXContent, toc, metadata } = evaluate(rawJs, components)

	if (filePathParts.length === 0) {
		metadata.asIndexPage = true
	}

	return (
		<Wrapper toc={toc} metadata={metadata}>
			<MDXContent />
		</Wrapper>
	)
}

export function generateStaticParams() {
	const params = Object.keys(mdxPages).map(route => ({
		slug: route.split('/')
	}))

	return params
}
