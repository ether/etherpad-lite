# Embed parameters
You can easily embed your etherpad-lite into any webpage by using iframes. You can configure the embedded pad using embed parameters.

Example:

Cut and paste the following code into any webpage to embed a pad. The parameters below will hide the chat and the line numbers.

```
<iframe src='http://pad.test.de/p/PAD_NAME?showChat=false&showLineNumbers=false' width=600 height=400></iframe>
```

## showLineNumbers
 * Boolean

Default: true

## showControls
 * Boolean

Default: true

## showChat
 * Boolean

Default: true

## useMonospaceFont
 * Boolean

Default: false

## userName
 * String

Default: "unnamed"

Example: `userName=Etherpad%20User`

## userColor
 * String (css hex color value)

Default: randomly chosen by pad server

Example: `userColor=%23ff9900`

## noColors
 * Boolean

Default: false

## alwaysShowChat
 * Boolean

Default: false

## lang
 * String

Default: en

Example: `lang=ar` (translates the interface into Arabic)

## rtl
 * Boolean

Default: true
Displays pad text from right to left.

