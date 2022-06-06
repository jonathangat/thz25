// wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", async () => {
  //set up map
  var map = L.map("map").setView([31.950124877508276, 34.80287893972995], 10);
  let legend = L.control({ position: "bottomleft" });

  // Adding a basemap (Carto Voyager)
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | אפיון ופיתוח: יונתן גת',
      maxZoom: 19,
    }
  ).addTo(map);

  // interaction - mouse hover
  // https://leafletjs.com/examples/choropleth/
  function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
      weight: 3,
      color: "#666",
      dashArray: "",
      fillOpacity: 0.7,
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }
  }

  // add watermarks
  let logos = ["AyalonHighways.svg", "rashut_logo.png", "mot.png"];

  for (let i = 0; i < logos.length; i++) {
    L.Control.Watermark = L.Control.extend({
      onAdd: function (map) {
        var img = L.DomUtil.create("img");

        img.src = `./img/logos/${logos[i]}`;
        img.style.width = "100px";

        return img;
      },
    });

    L.control.watermark = function (opts) {
      return new L.Control.Watermark(opts);
    };

    L.control.watermark({ position: "bottomleft" }).addTo(map);
  }

  // function to populate the jurisSelect dropdown
  async function populate_juris_select() {
    // specify query
    let q =
      "https://jonathang.carto.com/api/v2/sql?q=SELECT DISTINCT muni_name FROM planned_service CROSS JOIN muni_layer WHERE st_intersects(planned_service.the_geom, muni_layer.the_geom) ORDER BY muni_name ASC";

    // fetch
    let request = fetch(q);
    request
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        let html = "";
        data.rows.forEach(function (element) {
          html += "<option>" + element.muni_name + "</option>";
        });
        document.getElementById("jurisSelect").innerHTML = html;
      });
  }

  // function to populate the jurisSelect dropdown
  async function populate_stops_select() {
    // specify query
    let q =
      "https://jonathang.carto.com/api/v2/sql?q=SELECT DISTINCT stop_muni.muni_name FROM (SELECT trip_id, stop_id FROM stop_times) AS trip_stop LEFT JOIN (SELECT stops.stop_id, muni_layer.muni_name FROM stops CROSS JOIN muni_layer WHERE ST_WITHIN(stops.the_geom,muni_layer.the_geom)) AS stop_muni ON trip_stop.stop_id = stop_muni.stop_id WHERE stop_muni.muni_name IS NOT NULL ORDER BY 1 ASC";

    // fetch
    let request = fetch(q);
    request
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        let html = "";
        data.rows.forEach(function (element) {
          html += "<option>" + element.muni_name + "</option>";
        });
        document.getElementById("StopsSelect").innerHTML = html;
      });
  }

  // add an empty route layer
  let routeLayer = L.featureGroup();

  // add an empty terminal layer
  let terminalLayer = L.featureGroup();

  // get all routes
  async function get_all_routes() {
    // start spinning!
    map.spin(true);

    // clear previous queries
    routeLayer.clearLayers();
    // query string
    let sqlGetAllRoutes =
      "https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT%20*%20FROM%20planned_service";

    // fetch request
    let request = fetch(sqlGetAllRoutes);

    // reset highlight
    function resetHighlight(e) {
      geojson.resetStyle(e.target);
    }

    // on each feature
    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        // click: clickFeature,
      });

      // build popup content
      let popupContent = `<div class="popupcontent">`;
      if (feature.properties.route_short_name) {
        popupContent += `<span class="popupHeader">חלופה: ${feature.properties.route_short_name}</span><br style="display: block;margin: 2px 0;" />`;
      }
      if (feature.properties.route_desc) {
        popupContent += `<b>תיאור חלופה: </b>${feature.properties.route_desc}<br />`;
      }
      if (feature.properties.direction_id) {
        popupContent += `<b>כיוון חלופה: </b>${feature.properties.direction_id}<br />`;
      }
      if (feature.properties.origin_terminal_id) {
        popupContent += `<b>מזהה מסוף מוצא: </b>${feature.properties.origin_terminal_id}<br /`;
      }
      if (feature.properties.origin_terminal_name) {
        popupContent += `<b>שם מסוף מוצא: </b>${feature.properties.origin_terminal_name}<br />`;
      }
      if (feature.properties.origin_terminal_id) {
        popupContent += `<b>מזהה מסוף יעד: </b>${feature.properties.destination_terminal_id}<br />`;
      }
      if (feature.properties.origin_terminal_name) {
        popupContent += `<b>שם מסוף יעד: </b>${feature.properties.destination_terminal_name}<br />`;
      }

      if (
        feature.properties.freq_5 +
        feature.properties.freq_6 +
        feature.properties.freq_7 +
        feature.properties.freq_8 +
        feature.properties.freq_9 +
        feature.properties.freq_10 +
        feature.properties.freq_11 +
        feature.properties.freq_12 +
        feature.properties.freq_13 +
        feature.properties.freq_14 +
        feature.properties.freq_15 +
        feature.properties.freq_16 +
        feature.properties.freq_17 +
        feature.properties.freq_18 +
        feature.properties.freq_19 +
        feature.properties.freq_20 +
        feature.properties.freq_21 +
        feature.properties.freq_22 +
        feature.properties.freq_23 +
        feature.properties.freq_24
      ) {
        popupContent += "<br /><b>תדירויות מתוכננות (שלישי)</b><br />";
      }

      if (feature.properties.freq_5) {
        popupContent += `<b>05:00</b> ${feature.properties.freq_5} יציאות<br />`;
      }
      if (feature.properties.freq_6) {
        popupContent += `<b>06:00</b> ${feature.properties.freq_6} יציאות<br />`;
      }
      if (feature.properties.freq_7) {
        popupContent += `<b>07:00</b> ${feature.properties.freq_7} יציאות<br />`;
      }
      if (feature.properties.freq_8) {
        popupContent += `<b>08:00</b> ${feature.properties.freq_8} יציאות<br />`;
      }
      if (feature.properties.freq_9) {
        popupContent += `<b>09:00</b> ${feature.properties.freq_9} יציאות<br />`;
      }
      if (feature.properties.freq_10) {
        popupContent += `<b>10:00</b> ${feature.properties.freq_10} יציאות<br />`;
      }
      if (feature.properties.freq_11) {
        popupContent += `<b>11:00</b> ${feature.properties.freq_11} יציאות<br />`;
      }
      if (feature.properties.freq_12) {
        popupContent += `<b>12:00</b> ${feature.properties.freq_12} יציאות<br />`;
      }
      if (feature.properties.freq_13) {
        popupContent += `<b>13:00</b> ${feature.properties.freq_13} יציאות<br />`;
      }
      if (feature.properties.freq_14) {
        popupContent += `<b>14:00</b> ${feature.properties.freq_14} יציאות<br />`;
      }
      if (feature.properties.freq_15) {
        popupContent += `<b>15:00</b> ${feature.properties.freq_15} יציאות<br />`;
      }
      if (feature.properties.freq_16) {
        popupContent += `<b>16:00</b> ${feature.properties.freq_16} יציאות<br />`;
      }
      if (feature.properties.freq_17) {
        popupContent += `<b>17:00</b> ${feature.properties.freq_17} יציאות<br />`;
      }
      if (feature.properties.freq_18) {
        popupContent += `<b>18:00</b> ${feature.properties.freq_18} יציאות<br />`;
      }
      if (feature.properties.freq_19) {
        popupContent += `<b>19:00</b> ${feature.properties.freq_19} יציאות<br />`;
      }
      if (feature.properties.freq_20) {
        popupContent += `<b>20:00</b> ${feature.properties.freq_20} יציאות<br />`;
      }
      if (feature.properties.freq_21) {
        popupContent += `<b>21:00</b> ${feature.properties.freq_21} יציאות<br />`;
      }
      if (feature.properties.freq_22) {
        popupContent += `<b>22:00</b> ${feature.properties.freq_22} יציאות<br />`;
      }
      if (feature.properties.freq_23) {
        popupContent += `<b>23:00</b> ${feature.properties.freq_23} יציאות<br />`;
      }
      if (feature.properties.freq_24) {
        popupContent += `<b>24:00</b> ${feature.properties.freq_24} יציאות<br />`;
      }

      popupContent += "<br />";

      if (feature.properties.route_length) {
        popupContent += `<b>אורך מסלול בק"מ:</b> ${Math.round(
          feature.properties.route_length / 1000
        )}<br />`;
      }
      if (feature.properties.bus_lane_length) {
        popupContent += `<b>מתוכם נתיבי העדפה:</b> ${Math.round(
          feature.properties.bus_lane_length / 1000
        )}<br />`;
      }
      if (feature.properties.bus_lane_ratio) {
        popupContent += `<b>אחוז העדפה מתוך אורך מסלול:</b> ${Math.round(
          feature.properties.bus_lane_ratio * 100
        )}%<br />`;
      }

      popupContent += `</div>`;
      layer.bindPopup(popupContent);
    }

    // parse request to geojson object
    let parsed_geojson = await request.then((response) => response.json());

    let geojson = L.geoJson(parsed_geojson, {
      onEachFeature: onEachFeature,
    }).addTo(routeLayer);

    // fly to bounds
    map.flyToBounds(routeLayer.getBounds());

    // add layer to map
    routeLayer.addTo(map);

    // stop spinning
    map.spin(false);
  }

  ///////////////////////////////////////////////

  // get all routes
  async function get_all_terminals() {
    // start spinning!
    map.spin(true);

    // clear previous queries
    terminalLayer.clearLayers();
    // query string
    let sqlGetAllTerminals =
      "https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT * FROM bus_terminals";

    // fetch request
    let request = fetch(sqlGetAllTerminals);

    // reset highlight
    function resetHighlight(e) {
      geojson.resetStyle(e.target);
    }

    // on each feature
    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        // click: clickFeature,
      });

      // build popup content
      let popupContent = `<div class="popupcontent">`;
      if (feature.properties.term_name) {
        popupContent += `<span class="popupHeader">${feature.properties.term_name}</span><br style="display: block;margin: 2px 0;" />`;
      }
      if (feature.properties.unique_id) {
        popupContent += `<b>קוד מסוף: </b>${feature.properties.unique_id}<br />`;
      }
      if (feature.properties.peak_morning_in) {
        popupContent += `<b>נסיעות נכנסות שעות שיא בוקר: </b>${feature.properties.peak_morning_in}<br />`;
      }
      if (feature.properties.peak_evening_in) {
        popupContent += `<b>נסיעות נכנסות שעות שיא ערב: </b>${feature.properties.peak_evening_in}<br />`;
      }
      if (feature.properties.peak_morning_out) {
        popupContent += `<b>נסיעות יוצאות שעות שיא בוקר: </b>${feature.properties.peak_morning_out}<br />`;
      }
      if (feature.properties.peak_evening_out) {
        popupContent += `<b>נסיעות יוצאות שעות שיא ערב: </b>${feature.properties.peak_evening_out}<br />`;
      }
      if (feature.properties.served_routes) {
        popupContent += `<b>קווים משורתים: </b>${feature.properties.served_routes}<br />`;
      }

      popupContent += `</div>`;
      layer.bindPopup(popupContent);
    }

    // parse request to geojson object
    let parsed_geojson = await request.then((response) => response.json());

    let geojson = L.geoJson(parsed_geojson, {
      onEachFeature: onEachFeature,
      style: {
        weight: 2,
        fillColor: "yellow",
        fillOpacity: 0.2,
      },
    }).addTo(terminalLayer);

    // fly to bounds
    map.flyToBounds(terminalLayer.getBounds());

    // add layer to map
    terminalLayer.addTo(map);

    // stop spinning
    map.spin(false);
  }

  ////////////////////////////////////////////////////////////////

  // get juris routes
  async function get_juris_routes() {
    // start spinning!
    map.spin(true);

    // get juris value
    let juris_value = document.getElementById("jurisSelect").value;

    // clear previous queries
    routeLayer.clearLayers();
    // query string
    let sqlGetJurisRoutes = `https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT planned_service.* FROM planned_service CROSS JOIN muni_layer  WHERE st_intersects(planned_service.the_geom, muni_layer.the_geom) AND muni_name = '${juris_value}'`;
    // let sqlGetJurisRoutes = `https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT * FROM planned_service WHERE shape_id IN (SELECT DISTINCT trip_stop.trip_id FROM (SELECT trip_id, stop_id FROM stop_times) AS trip_stop LEFT JOIN (SELECT stops.stop_id, muni_layer.muni_name FROM stops CROSS JOIN muni_layer WHERE ST_WITHIN(stops.the_geom,muni_layer.the_geom)) AS stop_muni ON trip_stop.stop_id = stop_muni.stop_id WHERE stop_muni.muni_name = '${juris_value}')`;

    // fetch request
    let request = fetch(sqlGetJurisRoutes);

    // reset highlight
    function resetHighlight(e) {
      geojson.resetStyle(e.target);
    }

    // on each feature
    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        // click: clickFeature,
      });

      // build popup content
      let popupContent = `<div class="popupcontent">`;
      if (feature.properties.route_short_name) {
        popupContent += `<span class="popupHeader">חלופה: ${feature.properties.route_short_name}</span><br style="display: block;margin: 2px 0;" />`;
      }
      if (feature.properties.route_desc) {
        popupContent += `<b>תיאור חלופה: </b>${feature.properties.route_desc}<br />`;
      }
      if (feature.properties.direction_id) {
        popupContent += `<b>כיוון חלופה: </b>${feature.properties.direction_id}<br />`;
      }
      if (feature.properties.origin_terminal_id) {
        popupContent += `<b>מזהה מסוף מוצא: </b>${feature.properties.origin_terminal_id}<br /`;
      }
      if (feature.properties.origin_terminal_name) {
        popupContent += `<b>שם מסוף מוצא: </b>${feature.properties.origin_terminal_name}<br />`;
      }
      if (feature.properties.origin_terminal_id) {
        popupContent += `<b>מזהה מסוף יעד: </b>${feature.properties.destination_terminal_id}<br />`;
      }
      if (feature.properties.origin_terminal_name) {
        popupContent += `<b>שם מסוף יעד: </b>${feature.properties.destination_terminal_name}<br />`;
      }

      if (
        feature.properties.freq_5 +
        feature.properties.freq_6 +
        feature.properties.freq_7 +
        feature.properties.freq_8 +
        feature.properties.freq_9 +
        feature.properties.freq_10 +
        feature.properties.freq_11 +
        feature.properties.freq_12 +
        feature.properties.freq_13 +
        feature.properties.freq_14 +
        feature.properties.freq_15 +
        feature.properties.freq_16 +
        feature.properties.freq_17 +
        feature.properties.freq_18 +
        feature.properties.freq_19 +
        feature.properties.freq_20 +
        feature.properties.freq_21 +
        feature.properties.freq_22 +
        feature.properties.freq_23 +
        feature.properties.freq_24
      ) {
        popupContent += "<br /><b>תדירויות מתוכננות (שלישי)</b><br />";
      }

      if (feature.properties.freq_5) {
        popupContent += `<b>05:00</b> ${feature.properties.freq_5} יציאות<br />`;
      }
      if (feature.properties.freq_6) {
        popupContent += `<b>06:00</b> ${feature.properties.freq_6} יציאות<br />`;
      }
      if (feature.properties.freq_7) {
        popupContent += `<b>07:00</b> ${feature.properties.freq_7} יציאות<br />`;
      }
      if (feature.properties.freq_8) {
        popupContent += `<b>08:00</b> ${feature.properties.freq_8} יציאות<br />`;
      }
      if (feature.properties.freq_9) {
        popupContent += `<b>09:00</b> ${feature.properties.freq_9} יציאות<br />`;
      }
      if (feature.properties.freq_10) {
        popupContent += `<b>10:00</b> ${feature.properties.freq_10} יציאות<br />`;
      }
      if (feature.properties.freq_11) {
        popupContent += `<b>11:00</b> ${feature.properties.freq_11} יציאות<br />`;
      }
      if (feature.properties.freq_12) {
        popupContent += `<b>12:00</b> ${feature.properties.freq_12} יציאות<br />`;
      }
      if (feature.properties.freq_13) {
        popupContent += `<b>13:00</b> ${feature.properties.freq_13} יציאות<br />`;
      }
      if (feature.properties.freq_14) {
        popupContent += `<b>14:00</b> ${feature.properties.freq_14} יציאות<br />`;
      }
      if (feature.properties.freq_15) {
        popupContent += `<b>15:00</b> ${feature.properties.freq_15} יציאות<br />`;
      }
      if (feature.properties.freq_16) {
        popupContent += `<b>16:00</b> ${feature.properties.freq_16} יציאות<br />`;
      }
      if (feature.properties.freq_17) {
        popupContent += `<b>17:00</b> ${feature.properties.freq_17} יציאות<br />`;
      }
      if (feature.properties.freq_18) {
        popupContent += `<b>18:00</b> ${feature.properties.freq_18} יציאות<br />`;
      }
      if (feature.properties.freq_19) {
        popupContent += `<b>19:00</b> ${feature.properties.freq_19} יציאות<br />`;
      }
      if (feature.properties.freq_20) {
        popupContent += `<b>20:00</b> ${feature.properties.freq_20} יציאות<br />`;
      }
      if (feature.properties.freq_21) {
        popupContent += `<b>21:00</b> ${feature.properties.freq_21} יציאות<br />`;
      }
      if (feature.properties.freq_22) {
        popupContent += `<b>22:00</b> ${feature.properties.freq_22} יציאות<br />`;
      }
      if (feature.properties.freq_23) {
        popupContent += `<b>23:00</b> ${feature.properties.freq_23} יציאות<br />`;
      }
      if (feature.properties.freq_24) {
        popupContent += `<b>24:00</b> ${feature.properties.freq_24} יציאות<br />`;
      }

      popupContent += "<br />";

      if (feature.properties.route_length) {
        popupContent += `<b>אורך מסלול בק"מ:</b> ${Math.round(
          feature.properties.route_length / 1000
        )}<br />`;
      }
      if (feature.properties.bus_lane_length) {
        popupContent += `<b>מתוכם נתיבי העדפה:</b> ${Math.round(
          feature.properties.bus_lane_length / 1000
        )}<br />`;
      }
      if (feature.properties.bus_lane_ratio) {
        popupContent += `<b>אחוז העדפה מתוך אורך מסלול:</b> ${Math.round(
          feature.properties.bus_lane_ratio * 100
        )}%<br />`;
      }

      popupContent += `</div>`;
      layer.bindPopup(popupContent);
    }

    // parse request to geojson object
    let parsed_geojson = await request.then((response) => response.json());

    let geojson = L.geoJson(parsed_geojson, {
      onEachFeature: onEachFeature,
    }).addTo(routeLayer);

    // fly to bounds
    map.flyToBounds(routeLayer.getBounds());

    // add layer to map
    routeLayer.addTo(map);

    // stop spinning
    map.spin(false);
  }

  // get juris routes
  async function get_stops_routes() {
    // start spinning!
    map.spin(true);

    // get juris value
    let juris_value = document.getElementById("StopsSelect").value;

    // clear previous queries
    routeLayer.clearLayers();
    // query string
    // let sqlGetJurisRoutes = `https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT planned_service.* FROM planned_service CROSS JOIN muni_layer  WHERE st_intersects(planned_service.the_geom, muni_layer.the_geom) AND muni_name = '${juris_value}'`;
    let sqlGetStopsRoutes = `https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT * FROM planned_service WHERE shape_id IN (SELECT DISTINCT trip_stop.trip_id FROM (SELECT trip_id, stop_id FROM stop_times) AS trip_stop LEFT JOIN (SELECT stops.stop_id, muni_layer.muni_name FROM stops CROSS JOIN muni_layer WHERE ST_WITHIN(stops.the_geom,muni_layer.the_geom)) AS stop_muni ON trip_stop.stop_id = stop_muni.stop_id WHERE stop_muni.muni_name = '${juris_value}')`;

    // fetch request
    let request = fetch(sqlGetStopsRoutes);

    // reset highlight
    function resetHighlight(e) {
      geojson.resetStyle(e.target);
    }

    // on each feature
    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        // click: clickFeature,
      });

      // build popup content
      let popupContent = `<div class="popupcontent">`;
      if (feature.properties.route_short_name) {
        popupContent += `<span class="popupHeader">חלופה: ${feature.properties.route_short_name}</span><br style="display: block;margin: 2px 0;" />`;
      }
      if (feature.properties.route_desc) {
        popupContent += `<b>תיאור חלופה: </b>${feature.properties.route_desc}<br />`;
      }
      if (feature.properties.direction_id) {
        popupContent += `<b>כיוון חלופה: </b>${feature.properties.direction_id}<br />`;
      }
      if (feature.properties.origin_terminal_id) {
        popupContent += `<b>מזהה מסוף מוצא: </b>${feature.properties.origin_terminal_id}<br /`;
      }
      if (feature.properties.origin_terminal_name) {
        popupContent += `<b>שם מסוף מוצא: </b>${feature.properties.origin_terminal_name}<br />`;
      }
      if (feature.properties.origin_terminal_id) {
        popupContent += `<b>מזהה מסוף יעד: </b>${feature.properties.destination_terminal_id}<br />`;
      }
      if (feature.properties.origin_terminal_name) {
        popupContent += `<b>שם מסוף יעד: </b>${feature.properties.destination_terminal_name}<br />`;
      }

      if (
        feature.properties.freq_5 +
        feature.properties.freq_6 +
        feature.properties.freq_7 +
        feature.properties.freq_8 +
        feature.properties.freq_9 +
        feature.properties.freq_10 +
        feature.properties.freq_11 +
        feature.properties.freq_12 +
        feature.properties.freq_13 +
        feature.properties.freq_14 +
        feature.properties.freq_15 +
        feature.properties.freq_16 +
        feature.properties.freq_17 +
        feature.properties.freq_18 +
        feature.properties.freq_19 +
        feature.properties.freq_20 +
        feature.properties.freq_21 +
        feature.properties.freq_22 +
        feature.properties.freq_23 +
        feature.properties.freq_24
      ) {
        popupContent += "<br /><b>תדירויות מתוכננות (שלישי)</b><br />";
      }

      if (feature.properties.freq_5) {
        popupContent += `<b>05:00</b> ${feature.properties.freq_5} יציאות<br />`;
      }
      if (feature.properties.freq_6) {
        popupContent += `<b>06:00</b> ${feature.properties.freq_6} יציאות<br />`;
      }
      if (feature.properties.freq_7) {
        popupContent += `<b>07:00</b> ${feature.properties.freq_7} יציאות<br />`;
      }
      if (feature.properties.freq_8) {
        popupContent += `<b>08:00</b> ${feature.properties.freq_8} יציאות<br />`;
      }
      if (feature.properties.freq_9) {
        popupContent += `<b>09:00</b> ${feature.properties.freq_9} יציאות<br />`;
      }
      if (feature.properties.freq_10) {
        popupContent += `<b>10:00</b> ${feature.properties.freq_10} יציאות<br />`;
      }
      if (feature.properties.freq_11) {
        popupContent += `<b>11:00</b> ${feature.properties.freq_11} יציאות<br />`;
      }
      if (feature.properties.freq_12) {
        popupContent += `<b>12:00</b> ${feature.properties.freq_12} יציאות<br />`;
      }
      if (feature.properties.freq_13) {
        popupContent += `<b>13:00</b> ${feature.properties.freq_13} יציאות<br />`;
      }
      if (feature.properties.freq_14) {
        popupContent += `<b>14:00</b> ${feature.properties.freq_14} יציאות<br />`;
      }
      if (feature.properties.freq_15) {
        popupContent += `<b>15:00</b> ${feature.properties.freq_15} יציאות<br />`;
      }
      if (feature.properties.freq_16) {
        popupContent += `<b>16:00</b> ${feature.properties.freq_16} יציאות<br />`;
      }
      if (feature.properties.freq_17) {
        popupContent += `<b>17:00</b> ${feature.properties.freq_17} יציאות<br />`;
      }
      if (feature.properties.freq_18) {
        popupContent += `<b>18:00</b> ${feature.properties.freq_18} יציאות<br />`;
      }
      if (feature.properties.freq_19) {
        popupContent += `<b>19:00</b> ${feature.properties.freq_19} יציאות<br />`;
      }
      if (feature.properties.freq_20) {
        popupContent += `<b>20:00</b> ${feature.properties.freq_20} יציאות<br />`;
      }
      if (feature.properties.freq_21) {
        popupContent += `<b>21:00</b> ${feature.properties.freq_21} יציאות<br />`;
      }
      if (feature.properties.freq_22) {
        popupContent += `<b>22:00</b> ${feature.properties.freq_22} יציאות<br />`;
      }
      if (feature.properties.freq_23) {
        popupContent += `<b>23:00</b> ${feature.properties.freq_23} יציאות<br />`;
      }
      if (feature.properties.freq_24) {
        popupContent += `<b>24:00</b> ${feature.properties.freq_24} יציאות<br />`;
      }

      popupContent += "<br />";

      if (feature.properties.route_length) {
        popupContent += `<b>אורך מסלול בק"מ:</b> ${Math.round(
          feature.properties.route_length / 1000
        )}<br />`;
      }
      if (feature.properties.bus_lane_length) {
        popupContent += `<b>מתוכם נתיבי העדפה:</b> ${Math.round(
          feature.properties.bus_lane_length / 1000
        )}<br />`;
      }
      if (feature.properties.bus_lane_ratio) {
        popupContent += `<b>אחוז העדפה מתוך אורך מסלול:</b> ${Math.round(
          feature.properties.bus_lane_ratio * 100
        )}%<br />`;
      }

      popupContent += `</div>`;
      layer.bindPopup(popupContent);
    }

    // parse request to geojson object
    let parsed_geojson = await request.then((response) => response.json());

    let geojson = L.geoJson(parsed_geojson, {
      onEachFeature: onEachFeature,
    }).addTo(routeLayer);

    // fly to bounds
    map.flyToBounds(routeLayer.getBounds());

    // add layer to map
    routeLayer.addTo(map);

    // stop spinning
    map.spin(false);
  }

  // add listeners
  document
    .getElementById("get_all_routes")
    .addEventListener("click", get_all_routes);

  document
    .getElementById("populate_juris_select_btn")
    .addEventListener("click", populate_juris_select);

  document
    .getElementById("populate_stops_select_btn")
    .addEventListener("click", populate_stops_select);

  document
    .getElementById("juris_select_btn")
    .addEventListener("click", get_juris_routes);

  document
    .getElementById("stops_select_btn")
    .addEventListener("click", get_stops_routes);

  document
    .getElementById("get_all_terminals_btn")
    .addEventListener("click", get_all_terminals);
});
