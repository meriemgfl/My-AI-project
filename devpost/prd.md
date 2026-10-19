---
doc: prd
status: approved
---
# Skincare Routine Personaliser — Product Requirements

A phone-first routine suggestion app for someone who owns several skincare products and wants less-overwhelming, more consistent routines.

Working title; the learner has not chosen a final app name.

Source: `scope.md > Who It's For`, `The Unique Kernel`, and `The Core Loop`.

## The Core Journey

1. The person opens the app. They see their saved routines, if any, and actions to create a routine or view/create their product list. On first use, **Create a routine** starts the questionnaire; profile questions are part of this same flow.
2. They select products they own from the preloaded product set. Saved products are already selected when they create another routine. If needed, they can first build their product list from that same set.
3. They complete the questionnaire: choose one or more skin concerns, select products to consider, and state schedule preferences—day or night, a clock time, and how many times a week.
4. The app presents potential routines based on the selected concerns and product information. Product usage guidance determines timing and frequency when available; otherwise the app uses the person's preferences. Possible results come from product information.
5. Each suggestion shows the concern(s) it targets, its timing and frequency, possible results, and ordered product steps. Steps follow the learner's stated general order: serums, moisturiser, then sunscreen. Expired products are excluded.
6. The person chooses a suggestion. It is saved in their profile on the current device.
7. On a later visit, they see saved routines and can open one to view its ordered product steps and guidance.

Source: `scope.md > The Core Loop`, `What "Working" Looks Like`, and `The POC Boundary`.

## Screens and Layout

A phone-first, minimal interface with generous white space, guided by the learner's reference image. The learner named simplicity and white space as the important qualities. Exact colors and typography are not established.

### Home and Saved Routines

- Show saved routine cards. Each card identifies the routine's day/night timing, preferred clock time, weekly frequency, and target skin concern(s).
- Provide one **Create a routine** action. It opens the questionnaire and collects the profile information used for suggestions; there is no separate **Finish profile** action because it would open the same questionnaire.
- Provide **View/create product list** as a separate action.
- With no saved routines, keep the same two actions and make **Create a routine** the clear starting point.

Source: `scope.md > The Core Loop` and `What "Working" Looks Like`.

### Questionnaire and Routine Suggestions

- Let the person select multiple skin concerns from suggested choices. Learner examples: dry skin, aging skin, fine lines, rosacea, and sun damage.
- Let them select products they own from the preloaded product set. When returning, begin with products already saved in their list.
- Capture schedule preferences: day or night, preferred clock time (for example, 8 a.m.), and weekly frequency.
- Present matching potential routines. A person can choose one to save.

Source: `scope.md > The Core Loop` and `The POC Boundary`.

### Product List

- Let the person browse or search the preloaded product set and select products for their own list.
- Show product name, brand, ingredients, estimated price, benefits, and expiration date.
- The person enters the expiration date for their own item; if they do not know it, keep the item eligible and show a “Missing expiry date” label. Barcode scanning is deferred.
- Keep saved products available to the questionnaire on the same device.

Source: `scope.md > The POC Boundary` and `Later`.

### Routine Details

- Show the routine's target concern(s), schedule, and numbered product steps.
- Each step identifies the product and gives a short use-purpose instruction, such as “Use this moisturiser to prep your skin.”
- Order the supported product types by the learner's stated general sequence: serums, moisturiser, sunscreen.
- Product information supplies timing/frequency when available; otherwise show the questionnaire preference.

Source: `scope.md > The Unique Kernel` and `What "Working" Looks Like`.

## Look and Feel

Phone-first and minimal, with generous white space. The learner shared a skincare shopping app image as a reference and said its white space and minimal design mattered most. Avoid a crowded dashboard or dense product cards. Specific typefaces and final colors remain open for the technical plan/build to establish without changing the minimal direction.

## Features and Behavior

### Product List and Expiration

- Product records in the preloaded set provide name, brand, ingredients, estimated price, benefits, and any available usage timing/frequency information.
- The person adds products they own by selecting from the preloaded set and entering the expiration date for their individual item.
- An item past its entered expiration date is not included in suggested routines. If an item has no known expiration date, it remains eligible and shows a “Missing expiry date” label.
- Product selection supports search and browsing.

**Acceptance criteria**

- A person can search or browse the preloaded set and add a product to their list.
- Product details show the agreed fields: name, brand, ingredients, estimated price, benefits, and expiration date.
- A product with an expiration date in the past is absent from suggested routines.

Source: `scope.md > The POC Boundary`.

### Questionnaire and Routine Suggestions

- The questionnaire supports choosing multiple concerns—including all learner examples: dry skin, aging skin, fine lines, rosacea, and sun damage—and owned products, and captures day/night preference, clock time, and number of uses per week.
- When a saved product list exists, start with those products selected so the person does not need to rebuild the list for each routine.
- Suggestions use both selected concerns and product information. Their possible-result descriptions are drawn from product benefits/information, not generated independently.
- Use product guidance for timing/frequency when present. If that information is absent, use the person's questionnaire preferences.
- Present routine options with targeted concern(s), possible results, schedule, and ordered product steps.
- Order product types using the stated sequence: serums, moisturiser, then sunscreen.
- If nothing fits, let the person adjust their answers or select fewer concerns instead of recommending products they do not own.
- Selecting a suggestion saves it in the person's profile on the same device.

**Acceptance criteria**

- A person can select more than one concern and choose products from the preloaded set.
- A returning person sees their saved products selected when beginning another questionnaire.
- The result screen shows potential routines based on both the selected concerns and product information.
- Product guidance takes priority for timing/frequency; questionnaire preferences fill gaps.
- Product steps appear in the agreed sequence and expired products are omitted.
- When no routine fits, the app offers a way to change answers or reduce selected concerns.
- Choosing a suggestion adds it to the saved-routines home view, and it remains available after closing and reopening the app on that device.

Source: `scope.md > The Core Loop`, `What "Working" Looks Like`, and `The POC Boundary`.

### Saved Routines

- Each saved routine identifies the day/night period, clock time, weekly frequency, and concern(s) it targets.
- Opening a routine shows numbered product steps with short purpose/use guidance.

**Acceptance criteria**

- After choosing a suggestion, the routine appears in the saved-routines view.
- A saved routine can be reopened and shows its schedule, target concern(s), products, and step order.

Source: `scope.md > The Core Loop` and `What "Working" Looks Like`.

## States and Boundaries

- **First use, no routines:** Show **Create a routine** and **View/create product list**. Creating a routine starts the questionnaire.
- **Saved products:** Preselect products from the person's list for a new questionnaire; they can choose what to use for that suggestion.
- **No matching suggestion:** Offer to adjust answers or select fewer skin concerns. Do not recommend products outside the person's list.
- **Expired product:** Exclude it from generated suggestions based on the date entered for that item.
- **Persistence:** Profile, product list, and routines remain on the current device. Cross-device access and accounts are deferred.
- **Missing expiration date:** Keep the product eligible and display a “Missing expiry date” label.

Source: `scope.md > The POC Boundary` and `Later`.

## Product Decisions

- The main demo is a questionnaire that produces routine suggestions; manually creating a routine or adding a product directly to an existing routine can wait.
- Product suggestions should use concerns and products the person owns.
- The product list comes from a small preloaded set; the person can search or browse it.
- A routine uses product timing/frequency information when available, then the user's preference when information is absent.
- The person chooses a suggested routine and saves it on one device; accounts and cross-device access are deferred.
- Product names and details can come from the preloaded set, while expiration date is entered for the person's own item. If no date is known, the item stays eligible with a “Missing expiry date” label. Barcode scanning can wait.
- If no routine fits, let the person adjust or reduce selected skin concerns rather than suggesting products they do not own.
- The user-facing design should be phone-first, minimal, and spacious.

## What We're Building

A phone-first, single-device prototype with a product list sourced from a small preloaded set, a questionnaire for concerns/products/schedule, possible routine suggestions grounded in product information, and the ability to choose and reopen a saved routine. Expired items are excluded from suggestions.

## Deferred From the POC

- Manual routine creation and direct product addition to an existing routine.
- Swap recommendations, a reserve list, and marking products finished.
- Barcode scanning and recognition of arbitrary products.
- Accounts and access across devices.
- Recommendations for products the person does not own.

Source: `scope.md > Later`.

## Possible Later Enhancements

Broader product analysis, richer routine management, barcode-based product lookup, and accounts/synchronization can be explored after the proof of concept demonstrates the questionnaire-to-routine journey.

## Non-Goals

- Building a full skincare marketplace; the prototype uses a small preloaded product set. (Source: `scope.md > The POC Boundary` and `Later`.)
- Cross-device accounts or synchronization. (Source: `scope.md > Later`.)
- Manual routine editing or product swapping in the first demo. (Source: `scope.md > Later`.)

## Open Questions

- **Working title:** Is “Skincare Routine Personaliser” adequate for now, or does the learner have a name in mind? This can wait until the build.
