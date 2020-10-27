const imageDownloader = require('image-downloader')
const gm = require('gm').subClass({imageMagick: true})
const google = require('googleapis').google
const customSearch = google.customsearch('v1')
const state = require('./state.js')

const googleSearchCredentials = require('../credentials/google-search.json')

async function robot() {
    console.log(`> [Image-robot] Starting...`)
    const content = state.load()

    await fetchImagesOfAllSentences(content)
    downloadAllImages(content)
    await convertAllImages(content)
    await createAllSentenceImages(content)
    await createYouTubeThumbnail()

    state.save(content)

    async function fetchImagesOfAllSentences(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            let query

            if (sentenceIndex === 0) {
                query = `${content.searchTerm}`
            } else {
                query = `${content.searchTerm} ${content.sentences[sentenceIndex].keywords[0]}`
            }

            
            console.log(`> [Image-robot] Querying Google Images With "${query}"`)

            content.sentences[sentenceIndex].images = await fetchGoogleAndReturnImagesLinks(query)
            content.sentences[sentenceIndex].googleSearchQuery = query

        }
    }

    async function fetchGoogleAndReturnImagesLinks(query) {
    const response = await customSearch.cse.list({
        auth: googleSearchCredentials.apiKey,
        cx: googleSearchCredentials.searchEngineId,
        q: query,
        searchType: 'image',
        // imgSize: 'huge',
        num: 2
    })    
    const imagesUrl = response.data.items.map((item) => {
        return item.link
    })
    return imagesUrl
    }

    async function downloadAllImages(content) {
        content.downloadedImages = []

        

        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            const images = content.sentences[sentenceIndex].images

            for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
                const imageUrl = images[imageIndex]

                try {
                    if (content.downloadedImages.includes(imageUrl)) {
                        throw new Error('> [Image-robot] Image already Downloaded')
                    }
                    await downloadAndSave(imageUrl, `${sentenceIndex}-original.png`)
                    content.downloadedImages.push(imageUrl)
                    console.log(`> [Image-robot] [${sentenceIndex}][${imageIndex}] Image Successfully downloaded: ${imageUrl}`)
                    break
                } catch(error) {
                    console.log(`> [Image-robot] [${sentenceIndex}][${imageIndex}] Error (${imageUrl}): ${error}`)
                }
            }
        }
    }
    
    async function downloadAndSave(url, fileName) {
        return imageDownloader.image({
        url: url,
        dest: `./content/${fileName}`
        })
    }
    
    async function convertAllImages(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await convertImage(sentenceIndex)
        }
    }

    async function convertImage(sentenceIndex) {
        return new Promise((resolve, reject) => {
          const inputFile = `./content/${sentenceIndex}-original.png[0]`
          const outputFile = `./content/${sentenceIndex}-converted.png`
          const width = 1920
          const height = 1080
    
          gm()
          .in(inputFile)
          .out('(')
            .out('-clone')
            .out('0')
            .out('-background', 'white')
            .out('-blur', '0x9')
            .out('-resize', `${width}x${height}^`)
          .out(')')
          .out('(')
            .out('-clone')
            .out('0')
            .out('-background', 'white')
            .out('-resize', `${width}x${height}`)
          .out(')')
          .out('-delete', '0')
          .out('-gravity', 'center')
          .out('-compose', 'over')
          .out('-composite')
          .out('-extent', `${width}x${height}`)
          .write(outputFile, (error) => {
              if (error) {
                  return reject(error)
              }

              console.log(`> Image converted: ${inputFile}`)
              resolve()
          })
        })
    }

    async function createAllSentenceImages(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await createSentenceImage(sentenceIndex, content.sentences[sentenceIndex].text)
        }
    }

    async function createSentenceImage(sentenceIndex, sentenceText) {
        return new Promise((resolve, reject) => {
            const outputFile = `./content/${sentenceIndex}-converted.png`

            const templateSettings = {
                0: {
                    size: '1920x480',
                    gravity: 'center'
                },
                1: {
                    size: '1920x1080',
                    gravity: 'center'
                },
                2: {
                    size: '800x1080',
                    gravity: 'west'
                },
                3: {
                    size: '1920x400',
                    gravity: 'center'
                },
                4: {
                    size: '1920x1080',
                    gravity: 'center'
                },
                5: {
                    size: '800x1080',
                    gravity: 'west'
                },
                6: {
                    size: '1920x400',
                    gravity: 'center'
                }
                
            }
            gm()
                  .out('-size', templateSettings[sentenceIndex].size)
                  .out('-gravity', templateSettings[sentenceIndex].gravity)
                  .out('-background', 'transparent')
                  .out('-fill', 'white')
                  .out('-kerning', '-1')
                  .out(`caption:${sentenceText}`)
                  .write(outputFile, (error) => {
                      if (error) {
                          return reject(error)
                      }

                      console.log(`> sentence Created: ${outputFile}`)
                      resolve()
                  })
        })
    }
    async function createYouTubeThumbnail() {
        return new Promise((resolve, reject) => {
            gm()
                .in('./content/0-converted.png')
                .write('./content/youtube-thumbnail.jpg', (error) => {
                    if (error) {
                        return reject(error)
                    }
                    
                    console.log(`> Creating YouTube thumbnail`)
                    resolve()
                })
        })
    }
}

module.exports = robot
