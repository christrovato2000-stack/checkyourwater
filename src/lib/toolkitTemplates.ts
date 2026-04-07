/**
 * Plain-text template strings for the council letter and public records
 * request. Centralized so the on-page rendering, the clipboard copy button,
 * and the static PDF generation script all use the exact same text.
 *
 * No em dashes anywhere in these templates by design.
 */

export const COUNCIL_LETTER_TEMPLATE = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Mayor/Council Member Name or "Dear Members of the City Council"]
[City Name] City Council
[City Hall Address]
[City, State ZIP]

RE: PFAS Contamination in [City Name]'s Drinking Water

Dear [Mayor/Council Members],

I am writing as a resident of [City/Neighborhood] to bring attention to recent EPA testing data showing PFAS contamination in our public water supply.

According to data from the EPA's Unregulated Contaminant Monitoring Rule 5 (UCMR 5) program, published by CheckYourWater.org, our water system [System Name, PWSID: XXXXXXX] tested positive for [Compound Name] at [X.X] parts per trillion. The EPA's enforceable maximum contaminant level for this compound is [Y] parts per trillion. Our water exceeds this federal limit by a factor of [ratio].

[If multiple compounds detected: Testing also detected [Compound 2] at [level] ppt and [Compound 3] at [level] ppt. In total, [N] PFAS compounds were detected in our water system.]

PFAS, known as "forever chemicals," do not break down in the environment or the human body. The EPA established these limits after determining that prolonged exposure at levels above the MCL poses health risks including increased cancer risk, immune system effects, and developmental impacts in children.

I am requesting that the City Council take the following actions:

1. Issue a public statement acknowledging the UCMR 5 testing results for our water system and communicating them to all residents in plain language.

2. Direct the water utility to prepare a timeline and cost estimate for installing PFAS treatment (granular activated carbon filtration, reverse osmosis, or ion exchange) to bring our water below federal limits before the 2029 compliance deadline.

3. In the interim, provide guidance to residents on reducing PFAS exposure, particularly for pregnant women, nursing mothers, and households with infants, including information about NSF 53 and NSF 58 certified water filters.

4. Make the utility's full PFAS testing data, any treatment feasibility studies, and communications with the EPA available to the public.

I have attached a Water Quality Report Card for our system generated from the EPA data. I am prepared to discuss these findings at a future council meeting and welcome the opportunity to work with the council on a response that protects our community's health.

Respectfully,

[Your Name]
[Phone Number]
[Email Address]

Enclosure: Water Quality Report Card (available at checkyourwater.org)
`;

export const RECORDS_REQUEST_TEMPLATE = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Water Utility Name]
[Utility Address]
[City, State ZIP]

RE: Public Records Request, PFAS Testing Data

Dear Records Officer,

Pursuant to [State]'s public records law (note: the specific statute varies by state, check your state's Freedom of Information or Open Records law), I am requesting copies of the following records related to per- and polyfluoroalkyl substance (PFAS) contamination in the [System Name] water system (PWSID: [XXXXXXX]):

1. All PFAS testing results conducted on the water system from January 2020 to present, including but not limited to results from the EPA's Unregulated Contaminant Monitoring Rule 5 (UCMR 5) program and any state-mandated or voluntary testing.

2. Any communications between the utility and the EPA, state environmental agency, or state health department regarding PFAS contamination or testing requirements.

3. Any feasibility studies, engineering assessments, or cost estimates related to PFAS treatment or remediation for this water system.

4. Any contracts with laboratories for PFAS testing, including the analytical methods used and detection limits.

5. Any notices, advisories, or communications sent to customers regarding PFAS testing results.

6. Any applications for state or federal funding to address PFAS contamination.

I request that these records be provided in electronic format where available. If any records are withheld, I request a written explanation citing the specific statutory exemption.

Please respond within the timeframe required by [State]'s public records law. If you anticipate that fulfilling this request will take longer or involve costs exceeding $[amount], please contact me before proceeding.

Thank you for your prompt attention to this request.

[Your Name]
[Phone Number]
[Email Address]
`;
