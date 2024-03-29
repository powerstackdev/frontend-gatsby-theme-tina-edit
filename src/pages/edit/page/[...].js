import React from "react"
import { graphql, navigate, useStaticQuery } from "gatsby"
import { useForm, usePlugin, useScreenPlugin } from "tinacms"
import { Global } from "@emotion/react"
import axios from "axios"
import qs from "qs"
import { imageListBlock } from "gatsby-theme-core-design-system/src/components/Images/ImageList"
import { paragraphBlock } from "gatsby-theme-core-design-system/src/components/Text/Paragraph"
import { featureListBlock } from "gatsby-theme-core-design-system/src/components/Features/FeatureList"
import { accordionListBlock } from "gatsby-theme-core-design-system/src/components/Accordions/AccordionList"
import { signpostListBlock } from "gatsby-theme-core-design-system/src/components/Signposts/SignpostList"
import { sliderListBlock } from "gatsby-theme-core-design-system/src/components/Sliders/SliderList"
import { InlineBlocks, InlineForm } from "react-tinacms-inline"
import { heroBlock } from "gatsby-theme-core-design-system/src/components/Heros/Hero"
import Seo from "gatsby-theme-core-design-system/src/components/Misc/Seo"
import { isLoggedIn } from "@powerstack/drupal-oauth-connector"
import {
  processDrupalFeaturesData,
  processDrupalImageData,
  processDrupalParagraphData,
  processDrupalSignpostsData,
  processDrupalSlidersData,
} from "../../../../utils/GetRequestUtils"
import { formatDrupalType } from "@powerstack/utils"
import Header from "gatsby-theme-core-design-system/src/components/Headers/Header"
import Footer from "gatsby-theme-core-design-system/src/components/Footers/Footer"
import { Title } from "gatsby-theme-core-design-system/src/components/Text/Title"
import { Box, Spinner, Text } from "theme-ui"

// These init functions are a bit of a hack to get around the the conditional rules of hooks error

const InitForm = (formConfig) => {
  return useForm(formConfig)
}

const InitPlugin = (form) => {
  usePlugin(form)

  return null
}

const InitScreenPlugin = (screenPlugin) => {
  useScreenPlugin(screenPlugin)

  return null
}

const EditPage = ({ serverData }) => {
  const isWindow =
    typeof window !== "undefined" && typeof window.tinacms !== "undefined"
  const data = useStaticQuery(graphql`
    query TinaSiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)

  const formConfig = {
    initialValues: serverData.content,
    onSubmit(data) {
      axios
        .post(
          process.env.GATSBY_DRUPAL_HOST + `/api/tinacms/page/create`,
          qs.stringify({
            json_data: data,
          })
        )
        .then(
          (response) => {
            isWindow && window.tinacms.alerts.success("Saved!")
          },
          (error) => {
            isWindow && window.tinacms.alerts.error("Error saving")
          }
        )
    },
  }

  const [, form] = isWindow ? InitForm(formConfig) : ["", ""]

  isWindow && InitPlugin(form)

  const ScreenPlugin = {
    name: "Example Screen",
    Component() {
      return <Text>test</Text>
    },
    Icon: () => "",
    layout: "fullscreen",
  }

  isWindow && InitScreenPlugin(ScreenPlugin)

  if (serverData.hasOwnProperty("goto")) {
    navigate("/admin/login", {
      state: {
        message: "your session has been timed out, please login",
        goto: serverData.goto,
      },
    })
    return null
  }

  return (
    <>
      <Global
        styles={(theme) => ({
          ":root": {
            "--tina-font-family":
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
            "--tina-color-primary": "#0071e3",
            "--theme-ui-colors-primary": "#1a73e8",
          },
          ".sc-hJZKUC": {
            display: "none",
          },
          ".sc-hYQoXb": {
            zIndex: "var(--tina-z-index-4)",
          },
          ".fFqali, .hIHHej": {
            backgroundColor: "transparent",
            boxShadow: "none",
            border: "none",
          },
          ".kvJowW": {
            padding: "var(--tina-padding-big)",
            textAlign: "center",
            color: "var(--tina-color-grey-8)",
            "&:hover": {
              color: "var(--tina-color-primary)",
              background: "transparent",
            },
            "&:after": {
              color: "var(--tina-color-primary)",
              background: "transparent",
            },
          },
          ".ccMyHd, .kvJowW": {
            svg: {
              display: "none",
            },
          },
          ".sc-tAExr, .sc-hYQoXb": {
            backdropFilter: "saturate(180%) blur(20px)",
            background: "rgba(255,255,255,0.72)",
          },
        })}
      />
      <Seo title="Edit page" />
      <Header siteTitle={data.site.siteMetadata?.title || `Title`} />
      <div className="home">
        {isWindow ? (
          <InlineForm form={isWindow && form}>
            <Title title={serverData.content?.title} />
            <InlineBlocks
              className={"blocks"}
              name="blocks"
              blocks={availableBlocks}
            />
          </InlineForm>
        ) : (
          <Box
            sx={{
              minHeight: `400px`,
              width: `100%`,
              display: `flex`,
              alignItems: `center`,
              justifyContent: `center`,
            }}
          >
            <Spinner />
          </Box>
        )}
      </div>
      <Footer />
    </>
  )
}

const availableBlocks = {
  hero: heroBlock,
  paragraph: paragraphBlock,
  images: imageListBlock,
  signposts: signpostListBlock,
  sliders: sliderListBlock,
  features: featureListBlock,
  accordions: accordionListBlock,
}

export default EditPage

export async function getServerData({ params, headers }) {
  const token = await isLoggedIn(Object.fromEntries(headers).cookie)

  const requestHeaders = {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  }

  const includes = [
    "field_page_builder",
    "field_page_builder.field_image.field_media.field_media_image",
    "field_page_builder.field_image.field_media.thumbnail",
    "field_page_builder.field_feature",
    "field_page_builder.field_signpost",
    "field_page_builder.field_slider",
    "field_page_builder.field_slider.field_media.field_media_image",
    "field_page_builder.field_slider.field_media.thumbnail",
  ]

  const currentRoute =
    `jsonapi/node?filter[drupal_internal__nid]=` +
    params["*"] +
    "&include=" +
    includes.toString() +
    `&jsonapi_include=1`

  try {
    const [adminMenu, content] = await Promise.all([
      fetch(
        process.env.GATSBY_DRUPAL_HOST + `/jsonapi/menu_items/admin`,
        requestHeaders
      ),
      fetch(
        process.env.GATSBY_DRUPAL_HOST + `/` + currentRoute,
        requestHeaders
      ),
    ])
    if (adminMenu.status === 401 || content.status === 401) {
      return {
        props: {
          goto: "page/edit/" + params["*"],
        },
      }
    }
    if (!adminMenu.ok || !content.ok) {
      throw new Error(`Response failed`)
    }

    const data = await content.json()

    let drupalData = {}

    let blocks = []

    if (!data.data[0].field_page_builder.hasOwnProperty("data")) {
      data.data[0].field_page_builder.forEach((value, index) => {
        let type = formatDrupalType(value.type)

        switch (type) {
          case "images":
            blocks[index] = processDrupalImageData(type, value)
            break

          case "features":
            blocks[index] = processDrupalFeaturesData(type, value)
            break

          case "signposts":
            blocks[index] = processDrupalSignpostsData(type, value)
            break

          case "sliders":
            blocks[index] = processDrupalSlidersData(type, value)
            break

          default:
            blocks[index] = processDrupalParagraphData(type, value)
        }
      })
    }

    drupalData.title = data.data[0].title
    drupalData.nid = data.data[0].drupal_internal__nid
    drupalData.uid = data.data[0].uid
    drupalData.blocks = blocks

    return {
      props: {
        adminMenu: await adminMenu.json(),
        content: drupalData,
      },
    }
  } catch (error) {
    console.log(error)
    return {
      status: 500,
      headers: {},
      props: {},
    }
  }
}
