# Standard Notes Asciidoc Editor Plugin

This is a repo to implements asciidoc editor with live preview in standard notes.
When you write in the editor, I use the asciidoctor processor to convert to the live preview aside.

If you don't know asciidoc, I suggest to read the great [documentation](https://asciidoc.org/)

I really like asciidoc simplicity, so I search for a way to write in asciidoc at standard notes. So when I don't find anything about that, I follow the [Guide to creating Standard Notes Plugins](https://randombits.dev/standard-notes/creating-extensions)

## Getting Started

To run locally:

```
# Install dependencies
pnpm install

# Start Dev Server
pnpm run start
```

The demo page should be launched automatically.

## Demo Page

The template includes a separate demo page that allows you to develop and test your plugin without it running inside standard notes. It works by wrapping your editor with a **mock standard notes**, which sends and receives the same events that the real application would.

The demo page and related scripts is built as a separate entry, and therefore is not included in your actual editor build. It is only included in the demo.html page.

The demo page can also be used to demonstrate your plugin on your personal website or blog.

Demo Example: https://jtlimo.github.io/sn-asciidoc-editor/demo.html

## Resources

[Asciidoc documentation](https://docs.asciidoctor.org/asciidoc/latest/)

[Guide to creating Standard Notes Plugins](https://randombits.dev/standard-notes/creating-extensions)

[Guide to installing Standard Notes Plugins](https://randombits.dev/standard-notes/installing-extensions)

