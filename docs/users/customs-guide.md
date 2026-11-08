# Customs guide

For Tracecart's customs officers and the admins who back them up. It covers customs rules and their sources, corridors, customs codes and customs cases. It describes what the console does today.

Open the console and choose **Customs**, or **Customs cases**. You need the customs permissions: customs officers and admins have them.

## 1. Rules, and what they rest on

A rule is one thing a country's or a customs union's law says about goods coming in:

- a **duty**, **levy** or **VAT**, with its rate and what it's charged on;
- goods **prohibited** or **restricted** (needing a licence);
- a **document** to show, a **threshold**, or a **note** for whoever reads the corridor.

Each rule says:

- **where it applies**: a country (ML) or a union (UEMOA, ECOWAS). Unions have their members with dates: Burkina Faso, Mali and Niger left ECOWAS on 29 January 2025, so ECOWAS rules stop applying to them that day;
- **what it covers**: all goods, goods under an HS code prefix, or a category and everything below it;
- **whose goods**: any origin, only goods originating in a country or union (a preference), or all goods except those (a levy on imports from outside a union);
- **when**: the first day it's in force, and the day it stops if known;
- **its source**: the regulation, law or guide, who published it, the article or page, and a link. A rule can't be saved without a source;
- **how sure it is**: read in the official text, from a secondary source (a guide, a broker), or an estimate.

### Verifying

A rule shows **To verify** until someone checks it. Open it, read the source, and check the figure, the dates and what it covers. Then write what you checked and choose **Verify this version**. You can't verify a rule you entered yourself: someone else must.

### Changing

Choose **Change (new version)**, correct what's wrong, and save. The change becomes a new version, which shows **To verify** again. Earlier versions stay listed under **Versions**, with who entered and verified each. A rule is never edited in place.

To end a rule, give it a last day in a new version.

## 2. Corridors

**Corridor** shows everything that applies to goods entering a country on a day:

- Choose where they **originate**: rules for their origin apply, others drop out. If you leave the origin out, rules that depend on it are marked **Depends on origin**.
- Each rule shows its figure, source, confidence and **Verified** or **To verify**.
- Below are the customs rates checkout prices duties with today (**Prices and margins → Customs rates**). They are estimates and aren't worked out from the rules yet: compare the two, and correct the rate if the rules say otherwise.

### Burkina Faso and Mali

The first corridor is described, both ways:

| | Goods originating in UEMOA | Goods from outside UEMOA |
| --- | --- | --- |
| Customs duty | None for originating goods; industrial ones need approval and a certificate of origin | The common external tariff: 0, 5, 10, 20 or 35 % by tariff category |
| Levies | None | Statistical fee 1 %, solidarity levy 1 % |
| VAT | 18 % in the destination country, on the value plus duties | The same |
| Note | Both countries left ECOWAS on 29 January 2025: check measures taken since before pricing a clearance | The same |

Each rule cites its source: UEMOA's Regulation 02/97 on the common external tariff, Additional Act 04/96, Additional Protocol III/2001 on rules of origin, each country's tax code, and ECOWAS's communiqué on the withdrawal. They were entered as **from a secondary source** and are **to verify**. Check each against the official text, and verify it or correct it.

A rule's first day is the earliest date it's known to hold, not the day the law was made.

## 3. Customs codes

A product's customs code (HS) is the one a customs officer confirmed. Everything else is a suggestion: **not binding**, and marked so.

- **Headings by category** (on the Customs page): give a category the heading its products usually fall under (4 to 6 digits, such as 8467). It's suggested for its products and those of the categories below it.
- On a product (in a "customs code needed" case), **Suggest codes** offers, cheapest first:
  1. the category's heading;
  2. the code most often confirmed for other products of the category;
  3. AI, only when neither exists.

  **Ask AI too** asks it for a second opinion anyway. AI suggestions are limited each day.
- **Confirm** makes a suggestion the product's code, or type the code and choose **Confirm this code**. Your name and the date are kept.
- **Reject** sets a suggestion aside.

## 4. Customs cases

Cases open by themselves:

- **Customs code needed**: a product with no confirmed code was sold across a border.
- **Restricted goods**: a freight request's estimate lists goods customs may restrict (medicines, for example), or a prohibiting or restricting rule covers what an order carries into its destination.

Each case goes to the customs officer with the fewest open cases (an admin, if there's no customs officer), who gets a notification. **Customs cases** lists yours; you can also see nobody's, or everyone's.

- **Take this case** starts on it. **Give to** passes it to another customs officer, or to nobody.
- A "customs code needed" case shows the product's code panel. Confirming the code closes the case. The case can't be resolved without a code, only dismissed.
- Otherwise, write what was decided, then **Resolve**, or **Dismiss** if there was nothing to do. What you write is kept.

A case doesn't stop the order or the shipment by itself. Act through the order, the freight request or the shipment, and say so in the case.
