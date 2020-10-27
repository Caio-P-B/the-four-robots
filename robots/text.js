const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey
const sentenceBoundaryDetection = require('sbd')

const watsonApiKey = require('../credentials/watson-nlu.json').apikey
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js')
 
const nlu = new NaturalLanguageUnderstandingV1({
  iam_apikey: watsonApiKey,
  version: '2018-04-05',
  url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
})

const state = require('./state.js')

async function robot() {
console.log('> [Text-robot] Starting...')
const content = state.load()

    await fetchContentFromWikipedia(content)
   sanitizeContent(content)
   breakContentIntoSentences(content)
   limitMaximumSentences(content)
   await fetchKeywordsOfAllSentences(content)


   state.save(content)


   async function fetchContentFromWikipedia(content) {
    console.log('> [Text-robot] Fetching Content from Wikipedia')
       const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey)
       const wikipediaAlgorithm = algorithmiaAuthenticated.algo('web/wikipediaParser/0.1.2')
       const wikipediaResponse = await wikipediaAlgorithm.pipe(content.searchTerm)
       const wikipediaContent = wikipediaResponse.get()
       
       content.sourceContentOriginal = wikipediaContent.content
       console.log('> [Text-robot] Fetching Done!')
   }
   function sanitizeContent(content) {
       const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal)
       const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown)
       
       content.sourceContentSanitized = withoutDatesInParentheses

       function removeBlankLinesAndMarkdown(text) {
           const allLines = text.split(`in`)

           const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
               if (line.trim().length === 0 || line.trim().startsWith('=')) {
                   return false
               }
               return true
           })
           return withoutBlankLinesAndMarkdown.join(' ')
       }
   }

   function removeDatesInParentheses(text) {
    return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm,'\n', '').replace(/  /g,' ').replace('\n')
   }
   function breakContentIntoSentences(content) {
       content.sentences = []

       const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
       sentences.forEach((sentence) => {
           content.sentences.push({
               text: sentence,
               keywords: [],
               images: []
           })
       })
   }

   function limitMaximumSentences(content) {
       content.sentences = content.sentences.slice(0, content.maximumSentences)
   }

   async function fetchKeywordsOfAllSentences(content) {
    console.log('> [Text-robot] Starting to Fetch Keywords from Watson')

       for (const sentence of content.sentences) {
        console.log(`> [Text-robot] Sentence: "${sentence.text}"`)
           sentence.keywords = await fetchWatsonAndReturnKeyWords(sentence.text)

           console.log(`> [Text-robot] Keywords: ${sentence.keywords.join(', ')}\n`)
       }
   }

   async function fetchWatsonAndReturnKeyWords(sentence) {
    return new Promise((resolve, reject) => {
        nlu.analyze({
            text: sentence,
            features: {
                keywords: {}
            }
        }, (error, response) => {
            if (error) {
                reject(error)
                return
            }

            const keywords = response.keywords.map((keyword) => {
            return keyword.text    
            })
            resolve(keywords)
        })
            
    })
}
}

module.exports = robot
