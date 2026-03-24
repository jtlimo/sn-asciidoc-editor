export interface TestData {
  title: string;
  text: string;
  meta?: any;
}

const EMPTY = {
  title: "Empty",
  text: "",
};

const SMALL = {
  title: "Small",
  text: "This is the note content for the small example",
  meta: {
    rows: 3,
  },
};

const LARGE = {
  title: "Large",
  text: "This is the note content for the large example",
  meta: {
    rows: 10,
  },
};

const ADMONITIONS_AND_CODE = {
  title: "Admonitions & Code Highlighting",
  text: `= AsciiDoc Features Demo

== Admonitions

NOTE: This is a note admonition block with important information.

TIP: Here's a helpful tip for using this editor effectively.

WARNING: Be careful! This is a warning that requires your attention.

CAUTION: Exercise caution when performing this action.

IMPORTANT: This point is critical and must not be overlooked.

== Code Examples

Here's a JavaScript example with syntax highlighting:

[source,javascript]
----
function greet(name) {
  return \`Hello, \${name}!\`;
}

const message = greet("World");
console.log(message);
----

And here's a Python example:

[source,python]
----
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

result = fibonacci(10)
print(f"Result: {result}")
----

== Inline Code

You can also use \`inline code\` within paragraphs, like \`const x = 42\` or \`function foo()\`.

== Mixed Content

[NOTE]
====
This is a more complex admonition with multiple paragraphs and other content.

You can include lists:
* First item
* Second item
* Third item

And even code blocks inside admonitions.
====
`,
  meta: {
    rows: 6,
  },
};

export const TEST_DATA: TestData[] = [ADMONITIONS_AND_CODE, SMALL, LARGE, EMPTY];

