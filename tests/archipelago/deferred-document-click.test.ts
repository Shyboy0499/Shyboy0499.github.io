import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installDeferredDocumentClick } from '../../src/worlds/archipelago/ui/deferred-document-click'

describe('installDeferredDocumentClick', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.replaceChildren()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ignores the click that installs the listener, then handles later clicks', () => {
    const trigger = document.createElement('button')
    const listener = vi.fn()
    let dispose = () => {}
    trigger.addEventListener('click', () => {
      dispose = installDeferredDocumentClick(listener)
    })
    document.body.append(trigger)

    trigger.click()
    expect(listener).not.toHaveBeenCalled()

    vi.runOnlyPendingTimers()
    document.body.click()
    expect(listener).toHaveBeenCalledOnce()

    dispose()
    document.body.click()
    expect(listener).toHaveBeenCalledOnce()
  })

  it('can be disposed before the listener is installed', () => {
    const listener = vi.fn()
    const dispose = installDeferredDocumentClick(listener)

    dispose()
    vi.runOnlyPendingTimers()
    document.body.click()

    expect(listener).not.toHaveBeenCalled()
  })
})
