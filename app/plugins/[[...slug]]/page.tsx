import { notFound } from 'next/navigation'
import { compileMdx } from 'nextra/compile'
import { Callout, Tabs } from 'nextra/components'
import { evaluate } from 'nextra/evaluate'
import {
	convertToPageMap,
} from 'nextra/page-map'
import { useMDXComponents as getMDXComponents } from '../../../mdx-components'
import { unstable_cache } from 'next/cache'

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

// This function now fetches and compiles all MDX files at build time.
const getAllCompiledMdx = unstable_cache(async () => {
    const compiledMdxCache = new Map<string, string>()

    for (const repoName in remotes) {
        const remote = remotes[repoName as keyof typeof remotes]
        const { mdxPages } = convertToPageMap({
            filePaths: remote.filePaths,
            basePath: repoName
        })

        for (const route in mdxPages) {
            const filePath = mdxPages[route]
            const { user, repo, branch, docsPath } = remote

            const response = await fetch(
                `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${docsPath ? docsPath + '/' : ''}${filePath}`
            )

            if (response.ok) {
                const data = await response.text()
                const compiled = await compileMdx(data, { filePath })
                compiledMdxCache.set(route, compiled)
            }
        }
    }
    return compiledMdxCache
}, ['all-compiled-remote-mdx'])


const getPluginData = unstable_cache(async () => {
    const mdxPages = {}
    const pageMapItems = []

    function updateRoutes(items: any, parentRoute: any) {
        return items.map((item: any) => {
            let currentItemRoute = item.route;
            const parentRouteSegments = parentRoute.split('/').filter(Boolean);
            const lastParentSegment = parentRouteSegments[parentRouteSegments.length - 1];

            if (lastParentSegment && currentItemRoute.startsWith(`/${lastParentSegment}`)) {
                currentItemRoute = currentItemRoute.substring(lastParentSegment.length + 1);
            }

            if (currentItemRoute.startsWith('/')) {
                currentItemRoute = currentItemRoute.substring(1);
            }
            const newRoute = `${parentRoute}/${currentItemRoute}`.replace(/\/\/+/g, '/');

            const updatedItem = {
                ...item,
                route: newRoute,
                title: item.title || item.name.replace(/\.mdx?$/, '').replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, (l: any) => l.toUpperCase())
            };

            if (item.children) {
                updatedItem.children = updateRoutes(item.children, newRoute);
                updatedItem.type = 'menu';
            }
            return updatedItem;
        });
    }

    for (const repo in remotes) {
        const remote = remotes[repo as keyof typeof remotes]
        const { mdxPages: remoteMdxPages, pageMap: _pageMap } = convertToPageMap({
            filePaths: remote.filePaths,
            basePath: repo
        })

        for (const key in remoteMdxPages) {
            //@ts-ignore
            mdxPages[`${repo}/${key.replace(/\/index$/, '')}`] = remoteMdxPages[key]
        }

        if (_pageMap.length > 0) {
            const rootPluginItem = _pageMap[0];
            const pluginRootRoute = `/plugins/${repo}`;

            //@ts-ignore
            const isReadmeIndex = _pageMap.length === 1 && (rootPluginItem?.children?.length === 1 && rootPluginItem.children[0].name === 'README');

            const finalPluginItem = {
                ...rootPluginItem,
                name: repo,
                route: pluginRootRoute,
                title: repo.split('-').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' '),
                type: isReadmeIndex ? 'page' : 'menu',
            };

            //@ts-ignore
            if (!isReadmeIndex && rootPluginItem.children) {
                //@ts-ignore
                finalPluginItem.children = updateRoutes(rootPluginItem.children, pluginRootRoute);
            } else if (isReadmeIndex) {
                //@ts-ignore
                delete finalPluginItem.children
            }

            pageMapItems.push(finalPluginItem);
        }
    }

    return { mdxPages, pageMap: pageMapItems }
}, ['plugin-data'])

const { mdxPages, pageMap: pageMapData } = await getPluginData()
const allCompiledMdx = await getAllCompiledMdx()

export const pageMap = pageMapData

const { wrapper: Wrapper, ...components } = getMDXComponents({
	$Tabs: Tabs,
	Callout
})

type PageProps = Readonly<{
	params: {
		slug?: string[]
	}
}>

export default async function Page({ params }: PageProps) {
    const slug = params.slug || []
    const route = slug.join('/')
    const finalRoute = slug.length === 0 ? 'README' : route

	const compiledMdx = allCompiledMdx.get(finalRoute)

	if (!compiledMdx) {
		notFound()
	}

    const { default: MDXContent, toc, metadata } = await evaluate(compiledMdx, components)

	return (
		<Wrapper toc={toc} metadata={metadata}>
			<MDXContent />
		</Wrapper>
	)
}

export function generateStaticParams() {
	return Object.keys(mdxPages).map(route => ({
		slug: route.split('/')
	}))
}