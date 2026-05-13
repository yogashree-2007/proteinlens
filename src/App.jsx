import { useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [gene, setGene] = useState(null);
  const [compounds, setCompounds] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);

  const calculateLipinski = (compound) => {
    let score = 0;

    if (compound.MolecularWeight <= 500) score++;
    if (compound.HBondDonorCount <= 5) score++;
    if (compound.HBondAcceptorCount <= 10) score++;
    if (compound.XLogP <= 5) score++;

    return score;
  };

  const searchProtein = async () => {
    if (!query) return;

    setLoading(true);

    try {

      // Gene Search
      const geneSearch = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=${query}[Gene Name]&retmode=json&retmax=1`
      );

      const geneSearchData = await geneSearch.json();

      const geneId = geneSearchData.esearchresult.idlist[0];

      // Gene Summary
      if (geneId) {

        const summaryRes = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id=${geneId}&retmode=json`
        );

        const summaryData = await summaryRes.json();

        setGene(summaryData.result[geneId]);

      } else {
        setGene(null);
      }

      // Fetch compounds + clinical trials together
      const [compoundRes, trialsRes] = await Promise.all([

        fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/property/MolecularFormula,MolecularWeight,IUPACName,HBondDonorCount,HBondAcceptorCount,XLogP/JSON?MaxRecords=6`
        ),

        fetch(
          `https://clinicaltrials.gov/api/v2/studies?query.cond=${query}&filter.overallStatus=RECRUITING,ACTIVE_NOT_RECRUITING&pageSize=4&format=json`
        )

      ]);

      // Compound Data
      const compoundData = await compoundRes.json();

      setCompounds(
        compoundData.PropertyTable?.Properties || []
      );

      // Trial Data
      const trialsData = await trialsRes.json();

      setTrials(trialsData.studies || []);

    } catch (error) {
      console.log(error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white px-6 py-10">

      <div className="max-w-6xl mx-auto">

        {/* Hero */}
        <div className="text-center mt-10">

          <h1 className="text-5xl md:text-6xl font-bold text-cyan-400">
            ProteinLens
          </h1>

          <p className="mt-4 text-gray-400 text-lg">
            Protein to Ligand in Seconds
          </p>

          <p className="text-gray-500 mt-2">
            Powered by NCBI + PubChem + ClinicalTrials.gov
          </p>

        </div>

        {/* Search */}
        <div className="mt-14 flex flex-col md:flex-row gap-4 justify-center">

          <input
            type="text"
            placeholder="Search TP53, insulin, aspirin..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full md:w-[500px] p-4 rounded-2xl bg-white/10 border border-cyan-400/20 outline-none focus:border-cyan-400"
          />

          <button
            onClick={searchProtein}
            className="bg-cyan-400 hover:bg-cyan-300 text-black px-8 py-4 rounded-2xl font-bold transition-all"
          >
            Search
          </button>

        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center mt-10 text-cyan-400 text-xl">
            Loading...
          </div>
        )}

        {/* Gene Card */}
        {gene && (

          <div className="mt-12 bg-white/5 border border-cyan-400/20 rounded-3xl p-6">

            <h2 className="text-3xl font-bold text-cyan-400">
              {gene.name}
            </h2>

            <p className="mt-4 text-gray-300">
              {gene.description}
            </p>

            <div className="mt-4 text-gray-400 space-y-2">

              <p>
                Organism: {gene.organism?.scientificname}
              </p>

              <p>
                Chromosome: {gene.chromosome}
              </p>

            </div>

          </div>

        )}

        {/* Compound Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-10">

          {compounds.map((compound) => {

            const score = calculateLipinski(compound);

            let badgeText = "";
            let badgeColor = "";

            if (score === 4) {
              badgeText = "Drug-like ✓";
              badgeColor = "bg-green-500";
            } else if (score === 3) {
              badgeText = "Mostly drug-like";
              badgeColor = "bg-yellow-500";
            } else {
              badgeText = "Poor drug-likeness";
              badgeColor = "bg-red-500";
            }

            return (

              <div
                key={compound.CID}
                className="bg-white/5 border border-cyan-400/20 rounded-3xl p-5"
              >

                {/* Structure */}
                <div className="bg-gray-100 rounded-2xl p-4 mb-4">

                  <img
                    src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${compound.CID}/PNG`}
                    alt="compound structure"
                    className="w-full h-40 object-contain"
                  />

                </div>

                {/* Badge */}
                <div className={`${badgeColor} text-black text-sm font-bold px-3 py-1 rounded-full inline-block mb-4`}>
                  {badgeText}
                </div>

                <h3 className="text-cyan-400 font-bold text-lg">
                  {compound.IUPACName || "Unknown Compound"}
                </h3>

                <div className="mt-4 space-y-2 text-gray-300">

                  <p>
                    Formula: {compound.MolecularFormula}
                  </p>

                  <p>
                    Weight: {compound.MolecularWeight}
                  </p>

                  <p>
                    H-Bond Donors: {compound.HBondDonorCount}
                  </p>

                  <p>
                    H-Bond Acceptors: {compound.HBondAcceptorCount}
                  </p>

                  <p>
                    LogP: {compound.XLogP}
                  </p>

                </div>

                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.CID}`}
                  target="_blank"
                  className="inline-block mt-4 text-cyan-400 hover:underline"
                >
                  View on PubChem
                </a>

              </div>

            );

          })}

        </div>

        {/* Clinical Trials */}
        <div className="mt-16">

          <h2 className="text-3xl font-bold text-cyan-400 mb-8">
            Active Clinical Trials
          </h2>

          {trials.length === 0 ? (

            <p className="text-gray-400">
              No active trials found.
            </p>

          ) : (

            <div className="grid md:grid-cols-2 gap-6">

              {trials.map((trial, index) => {

                const protocol = trial.protocolSection;

                const identification =
                  protocol?.identificationModule;

                const status =
                  protocol?.statusModule;

                const design =
                  protocol?.designModule;

                const sponsor =
                  protocol?.sponsorCollaboratorsModule;

                return (

                  <div
                    key={index}
                    className="bg-white/5 border border-cyan-400/20 rounded-3xl p-6"
                  >

                    <h3 className="text-xl font-bold text-cyan-400">
                      {identification?.briefTitle}
                    </h3>

                    <div className="mt-4 space-y-2 text-gray-300">

                      <p>
                        Status: {status?.overallStatus}
                      </p>

                      <p>
                        Phase: {design?.phases?.join(", ")}
                      </p>

                      <p>
                        Sponsor: {sponsor?.leadSponsor?.name}
                      </p>

                    </div>

                    <a
                      href={`https://clinicaltrials.gov/study/${identification?.nctId}`}
                      target="_blank"
                      className="inline-block mt-4 text-cyan-400 hover:underline"
                    >
                      View Trial
                    </a>

                  </div>

                );

              })}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}

export default App;