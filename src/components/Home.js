import React, { useLayoutEffect, useState } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5geodata_worldLow from "@amcharts/amcharts5-geodata/worldLow";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import Navbar from './Navbar';
import './Home.css';
import TechPolicyAnalyzer from '../services/TechPolicyAnalyzer';

function Home() {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [policyInfo, setPolicyInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    let root = am5.Root.new("chartdiv");

    root.setThemes([am5themes_Animated.new(root)]);

    let chart = root.container.children.push(
      am5map.MapChart.new(root, {
        panX: "rotateX",
        panY: "rotateY",
        projection: am5map.geoOrthographic()
      })
    );

    let polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldLow,
        exclude: ["AQ"]
      })
    );

    polygonSeries.mapPolygons.template.setAll({
      tooltipText: "{name}",
      toggleKey: "active",
      interactive: true
    });

    polygonSeries.mapPolygons.template.states.create("hover", {
      fill: root.interfaceColors.get("primaryButtonHover")
    });

    let backgroundSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {}));
    backgroundSeries.mapPolygons.template.setAll({
      fill: root.interfaceColors.get("alternativeBackground"),
      fillOpacity: 0.1,
      strokeOpacity: 0
    });
    backgroundSeries.data.push({
      geometry: am5map.getGeoRectangle(90, 180, -90, -180)
    });

    chart.set("zoomControl", am5map.ZoomControl.new(root, {}));

    chart.chartContainer.get("background").events.on("click", function() {
      chart.goHome();
    });

    polygonSeries.mapPolygons.template.events.on("click", function(ev) {
      let country = ev.target.dataItem.dataContext.name;
      setSelectedCountry(country);
      fetchPolicyInfo(country);

      let dataItem = ev.target.dataItem;
      let coords = dataItem.get("visualCentroid");

      if (coords) {
        chart.animate({
          key: "rotationX",
          to: -coords.longitude,
          duration: 1500,
          easing: am5.ease.inOut(am5.ease.cubic)
        });
        chart.animate({
          key: "rotationY",
          to: -coords.latitude,
          duration: 1500,
          easing: am5.ease.inOut(am5.ease.cubic)
        });
      }
    });

    chart.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, []);

  const fetchPolicyInfo = async (country) => {
    setLoading(true);
    setPolicyInfo("");
    
    try {
        const analyzer = new TechPolicyAnalyzer(country);
        const data = await analyzer.generateReport();
        setPolicyInfo(data);
    } catch (error) {
        console.error('Error details:', error);
        setPolicyInfo({ error: "Error fetching policy information. Please try again later." });
    } finally {
        setLoading(false);
    }
};

  return (
    <div className="home-page">
      <Navbar />
      <div className="home-content">
        <h1>Welcome to Global Policy Detector</h1>
        <p>Explore and analyze tech policies across the globe.</p>
        <div className="content-wrapper">
          <div id="chartdiv" className="globe"></div>
          {selectedCountry && (
            <div className="country-info">
              <h3>{selectedCountry}</h3>
              {loading ? (
                <p className="loading-text">Analyzing policy news...</p>
              ) : policyInfo?.error ? (
                <p className="error-text">{policyInfo.error}</p>
              ) : policyInfo ? (
                <div className="policy-panel">
                  {policyInfo.summary && (
                    <div className="ai-summary">
                      <span className="ai-badge">AI Summary</span>
                      <p>{policyInfo.summary}</p>
                    </div>
                  )}
                  {policyInfo.top3?.length > 0 && (
                    <div className="top-headlines">
                      <h4>Top Headlines</h4>
                      {policyInfo.top3.map((article, i) => (
                        <a
                          key={i}
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="headline-card"
                        >
                          <div className="card-header">
                            <span className="category-tag">{article.category}</span>
                            {article.score != null && (
                              <span className="score-badge" title="Policy impact score">{article.score}/10</span>
                            )}
                          </div>
                          <p className="card-title">{article.title}</p>
                          <p className="card-meta">{typeof article.source === 'string' ? article.source : article.source?.name ?? 'Unknown'} · {article.date?.slice(0, 10)}</p>
                        </a>
                      ))}
                    </div>
                  )}
                  {!policyInfo.summary && !policyInfo.top3?.length && (
                    <p className="no-news">No tech policy news found for {selectedCountry}. This may be a country with limited English-language coverage.</p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;