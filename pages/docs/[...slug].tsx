import React, { useState } from 'react'
import styled from 'styled-components'
import { NextSeo } from 'next-seo'
import { GetStaticProps, GetStaticPaths } from 'next'
import {
  DocsLayout,
  MarkdownContent,
  DocsTextWrapper,
  Wrapper,
  Footer,
} from 'components/layout'
import {
  DocsNav,
  NavToggle,
  DocsHeaderNav,
  Overlay,
  DocsPagination,
} from 'components/ui'
import { InlineTextareaField, useInlineForm } from 'react-tinacms-inline'
import { TinaIcon } from 'components/logo'
import { useGithubMarkdownForm } from 'react-tinacms-github'
import { getDocProps } from 'utils/docs/getDocProps'
import { OpenAuthoringSiteForm } from 'components/layout/OpenAuthoringSiteForm'
import { GithubError } from 'next-tinacms-github'
import { InlineWysiwyg } from 'components/inline-wysiwyg'
import { usePlugin } from 'tinacms'
import Toc from '../../components/toc'
import { createTocListener, slugify, formatDate } from 'utils'
import fs from 'fs'
import path from 'path'

function DocTemplate(props) {
  // Registers Tina Form
  const [data, form] = useGithubMarkdownForm(props.file, formOptions)
  const [open, setOpen] = useState(false)
  const isBrowser = typeof window !== `undefined`
  const contentRef = React.useRef<HTMLDivElement>(null)
  const frontmatter = data.frontmatter
  const markdownBody = data.markdownBody
  const excerpt = props.file.data.excerpt
  const tocItems = props.tocItems
  const [activeIds, setActiveIds] = useState([])

  React.useEffect(() => {
    if (!isBrowser || !contentRef.current) {
      return
    }
    const activeTocListener = createTocListener(contentRef, setActiveIds)
    window.addEventListener('scroll', activeTocListener)

    return () => window.removeEventListener('scroll', activeTocListener)
  }, [contentRef, data])

  usePlugin(form)

  return (
    <OpenAuthoringSiteForm
      form={form}
      path={props.file.fileRelativePath}
      preview={props.preview}
    >
      <DocsLayout isEditing={props.preview}>
        <NextSeo
          title={frontmatter.title}
          titleTemplate={'%s | TinaCMS Docs'}
          description={excerpt}
          openGraph={{
            title: frontmatter.title,
            description: excerpt,
            images: [
              {
                url:
                  'https://res.cloudinary.com/forestry-demo/image/upload/l_text:tuner-regular.ttf_90_center:' +
                  encodeURIComponent(frontmatter.title) +
                  ',g_center,x_0,y_50,w_850,c_fit,co_rgb:EC4815/v1581087220/TinaCMS/tinacms-social-empty-docs.png',
                width: 1200,
                height: 628,
                alt: frontmatter.title + ` | TinaCMS Docs`,
              },
            ],
          }}
        />
        <DocsNavToggle open={open} onClick={() => setOpen(!open)} />
        <DocsMobileTinaIcon docs />
        <DocsNav open={open} navItems={props.docsNav} />
        <DocsContent>
          <DocsHeaderNav color={'light'} open={open} />
          <DocsTextWrapper>
            <DocsGrid>
              <DocGridHeader>
                <DocsPageTitle>
                  <InlineTextareaField name="frontmatter.title" />
                </DocsPageTitle>
              </DocGridHeader>
              <DocGridToc>
                <Toc tocItems={tocItems} activeIds={activeIds} />
              </DocGridToc>
              <DocGridContent ref={contentRef}>
                <hr />
                <InlineWysiwyg name="markdownBody">
                  <MarkdownContent escapeHtml={false} content={markdownBody} />
                </InlineWysiwyg>
                <DocsPagination
                  prevPage={props.prevPage}
                  nextPage={props.nextPage}
                />
              </DocGridContent>
            </DocsGrid>
          </DocsTextWrapper>
          <Footer light preview={props.preview} />
        </DocsContent>
        <Overlay open={open} onClick={() => setOpen(false)} />
      </DocsLayout>
    </OpenAuthoringSiteForm>
  )
}

export default DocTemplate

/*
 * DATA FETCHING ------------------------------------------------------
 */

export const getStaticProps: GetStaticProps = async function(props) {
  let { slug: slugs } = props.params

  // @ts-ignore This should maybe always be a string[]?
  const slug = slugs.join('/')

  try {
    return {
      props: {
        ...(await getDocProps(props, slug)).props,
      },
    }
  } catch (e) {
    if (e instanceof GithubError) {
      return {
        props: {
          previewError: { ...e }, //workaround since we cant return error as JSON
        },
      }
    } else {
      throw e
    }
  }
}

export const getStaticPaths: GetStaticPaths = async function() {
  const fg = require('fast-glob')
  const contentDir = './content/docs/'
  const files = await fg(`${contentDir}**/*.md`)
  return {
    fallback: false,
    paths: files
      .filter(file => !file.endsWith('index.md'))
      .map(file => {
        const path = file.substring(contentDir.length, file.length - 3)
        return { params: { slug: path.split('/') } }
      }),
  }
}

/*
 * TINA FORM CONFIG -----------------------------------------------------
 */

const formOptions = {
  label: 'Tina Doc',
  fields: [
    {
      label: 'Title',
      name: 'frontmatter.title',
      component: 'text',
    },
    {
      label: 'Previous Doc',
      name: 'frontmatter.prev',
      component: 'text',
    },
    {
      label: 'Next Doc',
      name: 'frontmatter.next',
      component: 'text',
    },
    {
      label: 'Documentation Body',
      name: 'markdownBody',
      component: 'markdown',
    },
  ],
}

/*
 * STYLES --------------------------------------------------------------
 */

export const DocsGrid = styled.div`
  display: grid;
  width: 100%;
  position: relative;
  grid-auto-columns: 2rem auto 2rem;
  grid-template-areas:
    '. header .'
    '. toc .'
    '. content .';
  padding-top: 2rem;
  padding-bottom: 3rem;

  @media (min-width: 1500px) {
    grid-template-areas:
      '. header header .'
      '. content toc .';
    grid-auto-columns: auto 768px 23rem auto;
    grid-column-gap: 2rem;
  }

  @media (min-width: 1700px) {
    grid-auto-columns: auto 768px 24rem auto;
    grid-column-gap: 3rem;
  }
`

export const DocGridHeader = styled.div`
  grid-area: header;
  width: 100%;
  justify-self: center;
  max-width: 768px;

  @media (min-width: 1500px) {
    max-width: none;
  }
`

export const DocGridToc = styled.div`
  grid-area: toc;
  width: 100%;
  justify-self: center;
  max-width: 768px;

  @media (min-width: 1500px) {
    padding-top: 4.5rem;
  }
`

interface ContentProps {
  ref: any
}

export const DocGridContent = styled.div<ContentProps>`
  grid-area: content;
  width: 100%;
  justify-self: center;
  max-width: 768px;
`

export const DocsPageTitle = styled.h1`
  font-size: 2rem;
  line-height: 1.3;
  letter-spacing: 0.1px;
  color: var(--color-primary);
  position: relative;
  font-family: var(--font-tuner);
  font-style: normal;

  @media (max-width: 1499px) {
    margin: 0 0 1.25rem 0 !important;
  }
`

export const DocsNavToggle = styled(NavToggle)`
  position: fixed;
  margin-top: 1.25rem;
  left: 1rem;
  z-index: 500;

  @media (min-width: 999px) {
    display: none;
  }
`

export const DocsMobileTinaIcon = styled(TinaIcon)`
  position: relative;
  display: block;
  padding: 1rem 0;

  h1 {
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (min-width: 1000px) {
    display: none;
  }
`

export const DocsContent = styled.div`
  grid-area: content;
`
