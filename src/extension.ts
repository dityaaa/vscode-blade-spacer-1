'use strict'

import * as vscode from 'vscode'

import {
  window,
  workspace,
  SnippetString,
  Range,
  Position,
  Selection,
  Disposable,
  ExtensionContext,
  TextEditor,
  TextDocument,
  Event,
  TextDocumentChangeEvent
} from 'vscode'

export function activate(context: ExtensionContext) {
  let spacer = new Spacer()

  context.subscriptions.push(
    workspace.onDidChangeTextDocument(e => {
      const triggers = ['{}', '!', '-', '{']
      e.contentChanges.forEach(change => {
        if (triggers.indexOf(change.text) !== -1) {
          spacer.space(e.document)
        }
      })
    })
  )
}

class Spacer {
  protected textAt(anchor: Position, startOffset: number, endOffset: number) {
    let start = 0
    if (anchor.character + startOffset > -1) {
      start = startOffset
    }
    return new Range(anchor.translate(0, start), anchor.translate(0, endOffset))
  }

  protected rangeForTagType(selection: Selection, tagType: string) {
    if (tagType === 'double') {
      return new Range(
        selection.start.line,
        selection.start.character + 1,
        selection.end.line,
        selection.end.character + 1
      )
    } else if (tagType === 'triple') {
      return new Range(
        selection.start.line,
        selection.start.character - 1,
        selection.end.line,
        selection.end.character + 3
      )
    } else if (tagType === 'unescaped') {
      return new Range(
        selection.start.line,
        selection.start.character,
        selection.end.line,
        selection.end.character + 1
      )
    } else if (tagType === 'comment') {
      return new Range(
        selection.start.line,
        selection.start.character - 2,
        selection.end.line,
        selection.end.character + 2
      )
    }

    return false
  }

  public space(document: TextDocument) {
    const editor = window.activeTextEditor

    if (!editor) {
      return
    }

    // TODO:
    // BUGFIX
    // space is called for EACH change made, so we need to figure out the
    // selection from the changes

    // PROBLEM if the insertSnippet method is called for each selection individually,
    // so it messes up multi cursor if you don't do ALL ranges

    // SOLUTIONS?
    // Prevent it from trying to space unless it's the first one?

    let ranges: Array<Range> = []
    let tagType: string = ''
    editor.selections.forEach(selection => {
      tagType = this.tagType(document, selection)
      let newRange = this.rangeForTagType(selection, tagType)
      if (newRange) {
        ranges.push(newRange)
      }
    })

    if (tagType == 'double') {
      editor.insertSnippet(
        new SnippetString(' ${1:${TM_SELECTED_TEXT}} $0'),
        ranges
      )
    }

    // loop through selections and with each:
    // + find the tag type for this selection
    // + add a range for this selection with a type to an allRanges array
    // + Finally, insert all the snippets at once AFTER the loop

    //

    //

    // if (tagType === 'double') {
    //   let allRanges = selections.map(value => {
    //     console.log(
    //       new Range(
    //         value.start.line,
    //         value.start.character + 1,
    //         value.end.line,
    //         value.end.character + 1
    //       )
    //     )
    //     return new Range(
    //       value.start.line,
    //       value.start.character + 1,
    //       value.end.line,
    //       value.end.character + 1
    //     )
    //   })
    //   // TODO: fix problem where this is called twice. the process of handling the snippet should only happen once.
    //   console.log('inserting snippet')
    //   editor.insertSnippet(
    //     new SnippetString(' ${1:${TM_SELECTED_TEXT}} $0'),
    //     allRanges
    //   )
    // } else if (tagType === 'triple') {
    //   let allRanges = selections.map(value => {
    //     return new Range(
    //       value.start.line,
    //       value.start.character - 1,
    //       value.end.line,
    //       value.end.character + 3
    //     )
    //   })
    //   editor.insertSnippet(
    //     new SnippetString('{ ${1:${TM_SELECTED_TEXT/[ {}]//g}} }$0'),
    //     allRanges
    //   )
    // } else if (tagType === 'unescaped') {
    //   let allRanges = selections.map(value => {
    //     return new Range(
    //       value.start.line,
    //       value.start.character,
    //       value.end.line,
    //       value.end.character + 1
    //     )
    //   })
    //   editor.insertSnippet(
    //     new SnippetString('! ${1:${TM_SELECTED_TEXT/[!{} ]/$1/g}} !!$0'),
    //     allRanges
    //   )
    // } else if (tagType === 'comment') {
    //   let allRanges = selections.map(value => {
    //     return new Range(
    //       value.start.line,
    //       value.start.character - 2,
    //       value.end.line,
    //       value.end.character + 2
    //     )
    //   })
    //   editor.insertSnippet(
    //     new SnippetString('-- ${1:${TM_SELECTED_TEXT/[-{} ]/$1/g}} --$0'),
    //     allRanges,
    //     { undoStopBefore: false, undoStopAfter: true }
    //   )
    // }
  }

  public tagType(document: TextDocument, selection: Selection) {
    let chars = {
      start: selection.start,
      end: selection.end,
      firstChar: document.getText(this.textAt(selection.start, 0, 1)),
      twoBefore: document.getText(this.textAt(selection.start, -1, 1)),
      threeBefore: document.getText(this.textAt(selection.start, -2, 1)),
      fourBefore: document.getText(this.textAt(selection.start, -3, 1)),
      fiveBefore: document.getText(this.textAt(selection.start, -4, 1)),
      charAfter: document.getText(this.textAt(selection.end, 1, 2)),
      twoAfter: document.getText(this.textAt(selection.end, 1, 3))
    }

    if (
      chars.twoBefore === '{{' &&
      chars.firstChar !== ' ' &&
      chars.twoAfter !== '--'
    ) {
      return 'double'
    }

    if (chars.fourBefore === '{{ {' && chars.firstChar !== ' ') {
      return 'triple'
    }

    if (chars.threeBefore === '{!!' && chars.firstChar !== ' ') {
      return 'unescaped'
    }

    if (chars.fiveBefore === '{{ --' && chars.firstChar === '-') {
      return 'comment'
    }

    return ''
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
