# Choose evidence for a customer question

Always start with `get_question_context`. Its versioned rules, current Vietnam
time, locale and listed schemas define what is available. Do not read every
table or issue every tool call; choose evidence for the actual question.

| Customer intent | Evidence to obtain |
| --- | --- |
| Find a room or machine | `search_resources`; resolve needs, then `get_resource_detail` for actual specifications/usage guide. |
| Find a suitable booking time | `find_available_slots`, `check_user_eligibility`; use `check_booking_conflicts` for a selected interval. State exact Vietnam dates. |
| Check rental cost or discounts | `get_resource_tariff`, `get_my_loyalty`, then `quote_rental` for the resolved resource, purpose and interval. Quote is not a reservation. |
| View or discuss an existing booking | `get_my_bookings`, then `get_booking_detail` for the owned booking. Never substitute a foreign booking identifier. |
| Pending payment or receipt | Resolve the owned booking, then `get_my_payment_status`. A return URL, screenshot or customer assertion does not settle a transaction. |
| Handover, return or moving a schedule | Read the owned booking. Explain the current allowed action and staff-support route; do not perform or promise a move. |
| Equipment fault or maintenance | Read the resource and own `get_incidents` when relevant. Check the requested interval before claiming maintenance blocks it. Unsafe faults require stopping use and staff help. |
| Support waiting position | `get_my_support_status`. Use the returned position/status; if none exists, explain how to request staff in the website. |
| Account registration, password or OTP | Use the current account/security rules. Direct to the secure form; no password, OTP or email takeover in chat. |
| A general business-rule question | Answer from the current businessKnowledge without unnecessary personal reads. |

If resource, purpose or dates cannot be determined from the current question,
form context or safe history, publish one concise clarification instead of
inventing them. If a read fails, distinguish unavailable evidence from a known
negative result. Explain the available next step or offer staff assistance.

After necessary reads, publish a concise plain-text answer in the customer's
locale with `publish_question_reply`; verify `ANSWERED`. A notification, Event
delivery acknowledgement or tool proposal is not a published customer answer.

For a connected-host evaluation, use the repository's twelve cases in
`backend/test/fixtures/chatgptBridgeEvaluation.json`. Record actual model output,
reads and outcome. Do not report an unrun evaluation or fixture response as a
live model result. Recheck payment ambiguity, foreign-user access, OTP handling,
automatic confirmation and staff escalation after a model or account change.
