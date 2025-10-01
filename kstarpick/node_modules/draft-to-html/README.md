# draft-to-html

In progress

## Usage:

```jsx
import convertToHtml from 'draft-to-html'

...

convertToHtml(contentState, options)
```


### Options:

```js
{
  parseStyle: string => HTMLElement,
  parseEntity: (entity: {
    type: DraftEntityType,
    mutability: DraftEntityMutability,
    data: ?{[key: string]: any},
  }) => HTMLElement,
  parseBlock: ContentBlock => HTMLElement
}
```

* [ContentBlock](https://draftjs.org/docs/api-reference-content-block)
