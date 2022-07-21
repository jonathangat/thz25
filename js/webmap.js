// wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", async () => {
  //set up map
  var map = L.map("map").setView([31.950124877508276, 34.80287893972995], 10);
  let legend = L.control({ position: "bottomleft" });

  function route_type_name(code) {
    if (code === 1) return "עורקי";
    if (code === 8) return "מקומי";
    if (code === 2) return "אזורי";
    if (code === 3) return "בינעירוני מטרופוליני";
    if (code === 4) return "בינעירוני ארצי";
    if (code === 5) return "פרימיום מטרופוליני";
    if (code === 7) return `מתע"ן`;
    return "אחר";
  }

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
  let logos = ["AyalonHighwaysPNG.png", "rashut_logo.png", "mot.png"];

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

  // ADD LAYER CONTROL TO MAP
  var layerControl = L.control.layers(null, null);
  layerControl.addTo(map);

  // LOAD BUS LANES LAYER
  var bus_lanes_layer_group = L.layerGroup();
  async function load_bus_lanes() {
    // set style
    function bus_lane_colour(lane_code) {
      if (lane_code === 0) return "#f9bf00";
      if (lane_code === 2) return "#be0067";
      if (lane_code === 3) return "#1d4ccc";
      if (lane_code === 4) return "#92caea";
      if (lane_code === 5) return "#b5b5b5";
      return "gray";
    }

    function bus_lane_dash_array(lane_code) {
      if (lane_code === 0) return null;
      if (lane_code === 2) return null;
      if (lane_code === 3) return null;
      if (lane_code === 4) return "5, 5";
      if (lane_code === 5) return "5, 5";
      return null;
    }

    function bus_lane_style(feature) {
      return {
        color: bus_lane_colour(feature.properties.status),
        dashArray: bus_lane_dash_array(feature.properties.status),
      };
    }

    // bind popup
    function bus_lane_status(lane_code) {
      if (lane_code === 0) return "קיים";
      if (lane_code === 2) return "מקודם";
      if (lane_code === 3) return "אושר בועדה מטרופולינית";
      if (lane_code === 4) return "תכנון פרוגרמטי";
      if (lane_code === 5) return "רשת צירי העדפה 2030+";
      return "אחר";
    }

    function onEachFeature(feature, layer) {
      let popupContent = `<div class="popupcontent"><span class="popupHeader">נתיב העדפה</span><br style="display: block;margin: 2px 0;" />`;

      if (feature.properties.type) {
        popupContent += `<b>סוג: </b> ${feature.properties.type} <br />`;
      }
      if (feature.properties.status) {
        popupContent += `<b>סטטוס:</b> ${bus_lane_status(
          feature.properties.status
        )}<br />`;
      }

      if (feature.properties.sourcename) {
        popupContent += `<b>מקור:</b> ${feature.properties.sourcename}<br />`;
      }

      popupContent += `</div>`;
      layer.bindPopup(popupContent);
    }

    // fetch data
    var fetch_bus_lanes = await fetch(
      "https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT route_id, type, sourcename, status, the_geom FROM bus_lanes"
    ).then((response) => response.json());

    // parse to geojson
    let geojson = L.geoJson(fetch_bus_lanes, {
      onEachFeature: onEachFeature,
      style: bus_lane_style,
    }).addTo(bus_lanes_layer_group);

    // add to map
    bus_lanes_layer_group.addTo(map);

    // add to layer control
    layerControl.addOverlay(bus_lanes_layer_group, "נתיבי העדפה");
  }

  // call the function
  load_bus_lanes();

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

  // function to populate the jurisTypeSelect dropdown
  async function populate_juris_type_select() {
    // get juris value
    let juris_value = document.getElementById("jurisSelect").value;

    // specify query
    let q = `https://jonathang.carto.com/api/v2/sql?q=SELECT DISTINCT c_line_type FROM planned_service CROSS JOIN muni_layer WHERE st_intersects(planned_service.the_geom, muni_layer.the_geom) AND muni_name = '${juris_value}' ORDER BY c_line_type ASC`;

    // fetch
    let request = fetch(q);

    request
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        let html = "";
        data.rows.forEach(function (element) {
          html +=
            "<option>" + route_type_name(element.c_line_type) + "</option>";
        });
        document.getElementById("jurisTypeSelect").innerHTML = html;
      });
  }

  // function to populate the jurisRouteIdSelect dropdown
  async function populate_juris_route_id_select() {
    // get juris value
    let juris_value = document.getElementById("jurisSelect").value;
    let type_value = document.getElementById("jurisTypeSelect").value;

    // specify query
    let q = `https://jonathang.carto.com/api/v2/sql?q=SELECT  route_id, route_short_name, origin_terminal_name, destination_terminal_name FROM planned_service CROSS JOIN muni_layer WHERE st_intersects(planned_service.the_geom, muni_layer.the_geom) AND muni_name = '${juris_value}' AND c_line_type = ${type_value} ORDER BY c_line_type ASC`;

    // remove all options in dropdown

    // fetch
    let request = fetch(q);
    let html = "";

    var $multiSelectOptions = $("#jurisRouteIdSelect option");

    $multiSelectOptions.each(function (index, element) {
      element.remove();
      $("#jurisRouteIdSelect").selectpicker("refresh");
      console.log(element.value + "removed");
    });

    console.log("empty!!!");

    request
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        data.rows.forEach(function (element) {
          html +=
            `<option value="${element.route_id}">` +
            `${element.route_short_name.slice(-5)} מ${
              element.origin_terminal_name
            } אל ${element.destination_terminal_name}` +
            "</option>";
        });
        // refresh
        console.log(html);
        $("#jurisRouteIdSelect").html(html).selectpicker("refresh");
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

    function route_type_colour(code) {
      if (code === 1) return "#a6cee3";
      if (code === 8) return "#1f78b4";
      if (code === 2) return "#b2df8a";
      if (code === 3) return "#33a02c";
      if (code === 4) return "#fb9a99";
      if (code === 5) return "#e31a1c";
      if (code === 7) return "#fdbf6f";
      return "gray";
    }

    function route_style(feature) {
      return {
        color: route_type_colour(feature.properties.c_line_type),
      };
    }

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
        popupContent += `<span class="popupHeader">קו: ${feature.properties.route_short_name}</span><br style="display: block;margin: 2px 0;" />`;
      }
      if (feature.properties.c_line_type) {
        popupContent += `<b>סוג קו: </b>${route_type_name(
          feature.properties.c_line_type
        )}<br />`;
      }
      if (feature.properties.route_desc) {
        popupContent += `<b>תיאור קו: </b>${feature.properties.route_desc}<br />`;
      }
      if (feature.properties.direction_id) {
        popupContent += `<b>כיוון קו: </b>${feature.properties.direction_id}<br />`;
      }
      if (feature.properties.origin_terminal_id) {
        popupContent += `<b>מזהה מסוף מוצא: </b>${feature.properties.origin_terminal_id}<br />`;
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

      popupContent += "<br />";

      if (feature.properties.route_length) {
        popupContent += `<b>אורך מסלול במטרים:</b> ${feature.properties.route_length}<br />`;
      }
      if (feature.properties.bus_lane_length) {
        popupContent += `<b>מתוכם נתיבי העדפה:</b> ${feature.properties.bus_lane_length}<br />`;
      }
      if (feature.properties.bus_lane_existing_length) {
        popupContent += `<b>מתוכם קיימים: </b> ${feature.properties.bus_lane_existing_length}<br />`;
      }
      if (feature.properties.bus_lane_planned_length) {
        popupContent += `<b>מתוכם מתוכננים: </b> ${feature.properties.bus_lane_planned_length}<br />`;
      }
      if (feature.properties.bus_lane_ratio) {
        popupContent += `<b>אחוז העדפה סה"כ:</b> ${
          feature.properties.bus_lane_ratio * 100
        }%<br />`;
      }
      if (feature.properties.bus_lane_existing_ratio) {
        popupContent += `<b>אחוז העדפה קיים:</b> ${
          feature.properties.bus_lane_existing_ratio * 100
        }%<br />`;
      }
      if (feature.properties.bus_lane_planned_ratio) {
        popupContent += `<b>אחוז העדפה מתוכנן:</b> ${
          feature.properties.bus_lane_planned_ratio * 100
        }%<br />`;
      }

      popupContent += `<br />`;

      // morning_peak 	evening_peak 	max_hourly_freq
      if (feature.properties.morning_peak) {
        popupContent += `<b>תדירות שעות שיא בוקר:</b> ${feature.properties.morning_peak}<br />`;
      }
      if (feature.properties.evening_peak) {
        popupContent += `<b>תדירות שעות שיא ערב:</b> ${feature.properties.evening_peak}<br />`;
      }
      if (feature.properties.max_hourly_freq) {
        popupContent += `<b>תדירות שעתית מקסימלית:</b> ${feature.properties.max_hourly_freq}<br />`;
      }
      popupContent += `</div>`;
      layer.bindPopup(popupContent);
    }

    // parse request to geojson object
    let parsed_geojson = await request.then((response) => response.json());

    let geojson = L.geoJson(parsed_geojson, {
      onEachFeature: onEachFeature,
      style: route_style,
    }).addTo(routeLayer);

    // add layer to map
    routeLayer.addTo(map);

    // add to layer control
    layerControl.addOverlay(routeLayer, "קווי שירות");

    // fly to bounds
    map.flyToBounds(routeLayer.getBounds());

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

    // create a single polygon with centre
    // https://stackoverflow.com/questions/62469635/how-to-add-a-marker-to-the-middle-of-a-polygon-in-leaflet
    var polygonsWithCenters = L.layerGroup();

    // set costum icon
    var term_icon = L.Icon.extend({
      options: {
        iconSize: [15, 15],
      },
    });

    var term_large = new term_icon({
        iconUrl: "./img/symbols/terminals/large.png",
      }),
      term_medium = new term_icon({
        iconUrl: "./img/symbols/terminals/medium.png",
      }),
      term_multi = new term_icon({
        iconUrl: "./img/symbols/terminals/multi.png",
      }),
      term_night = new term_icon({
        iconUrl: "./img/symbols/terminals/night.png",
      }),
      term_small = new term_icon({
        iconUrl: "./img/symbols/terminals/small.png",
      }),
      term_missing = new term_icon({
        iconUrl: "./img/symbols/terminals/missing.png",
      });

    function get_term_icon(term_type) {
      if (term_type === "חניון לילה") return term_night;
      if (term_type === "מסוף גדול") return term_large;
      if (term_type === "מסוף בינוני") return term_medium;
      if (term_type === "מתקן משולב") return term_multi;
      if (term_type === "מסוף קטן") return term_small;
      return term_small;
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
      if (feature.properties.term_type) {
        popupContent += `<b>סוג מסוף: </b>${feature.properties.term_type}<br />`;
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
      // layer.bindPopup(popupContent);

      // get centre
      var centre = layer.getBounds().getCenter();

      var term_marker = L.marker(centre, {
        icon: get_term_icon(feature.properties.term_type),
      }).bindPopup(popupContent);

      var polygonAndItsCentre = L.layerGroup([layer, term_marker]);
      polygonAndItsCentre.addTo(polygonsWithCenters);
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
    });

    polygonsWithCenters.addTo(terminalLayer);

    // add to layer control
    layerControl.addOverlay(terminalLayer, "מסופים מתוכננים");

    // fly to bounds
    // map.flyToBounds(terminalLayer.getBounds());

    // add layer to map
    terminalLayer.addTo(map);

    // stop spinning
    map.spin(false);
  }

  get_all_terminals();

  ////////////////////////////////////////////////////////////////

  // get juris routes
  // add key values
  // https://stackoverflow.com/questions/27219/keeping-key-value-pairs-together-in-html-select-with-jquery
  async function get_juris_routes() {
    // start spinning!
    map.spin(true);

    // get juris value
    let juris_value = document.getElementById("jurisSelect").value;

    // get route_short_name
    let route_short_name = document.getElementById("jurisRouteIdSelect").value;

    // clear previous queries
    routeLayer.clearLayers();
    // query string
    let sqlGetRouteByShortName = `https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT * FROM planned_service WHERE route_short_name ='${route_short_name}'`;
    // let sqlGetJurisRoutes = `https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT planned_service.* FROM planned_service CROSS JOIN muni_layer  WHERE st_intersects(planned_service.the_geom, muni_layer.the_geom) AND muni_name = '${juris_value}'`;
    // let sqlGetJurisRoutes = `https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT * FROM planned_service WHERE shape_id IN (SELECT DISTINCT trip_stop.trip_id FROM (SELECT trip_id, stop_id FROM stop_times) AS trip_stop LEFT JOIN (SELECT stops.stop_id, muni_layer.muni_name FROM stops CROSS JOIN muni_layer WHERE ST_WITHIN(stops.the_geom,muni_layer.the_geom)) AS stop_muni ON trip_stop.stop_id = stop_muni.stop_id WHERE stop_muni.muni_name = '${juris_value}')`;

    // fetch request
    let request = fetch(sqlGetRouteByShortName);

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
        popupContent += `<b>מזהה מסוף מוצא: </b>${feature.properties.origin_terminal_id}<br />`;
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

    // clear layer control
    layerControl.removeLayer(routeLayer);

    // add to layer control
    layerControl.addOverlay(routeLayer, "קווי שירות");

    // stop spinning
    map.spin(false);
  }

  // Volume Modal - Populate selectVolumeFrom
  async function PopulateSelectVolumeFrom() {
    let html = "";
    for (let i = 5; i < 25; i++) {
      html += `<option>${i}</option>`;
    }
    document.getElementById("SelectVolumeFrom").innerHTML = html;
  }

  // Volume Modal - Populate selectVolumeFrom
  async function PopulateSelectVolumeTo() {
    let fromHour = document.getElementById("SelectVolumeFrom").value;
    let fromHourInt = parseInt(fromHour);
    let html = "";
    for (let i = fromHourInt; i < 25; i++) {
      html += `<option>${i}</option>`;
    }
    document.getElementById("SelectVolumeTo").innerHTML = html;
  }

  // Populate Modal SelectVolumeFrom
  PopulateSelectVolumeFrom();

  // add listeners

  document
    .getElementById("get_all_routes")
    .addEventListener("click", get_all_routes);

  document
    .getElementById("jurisSelect")
    .addEventListener("click", populate_juris_type_select);

  document
    .getElementById("jurisTypeSelect")
    .addEventListener("click", populate_juris_route_id_select);

  document
    .getElementById("populate_juris_select_btn")
    .addEventListener("click", populate_juris_select);

  document
    .getElementById("juris_select_btn")
    .addEventListener("click", get_juris_routes);

  document
    .getElementById("SelectVolumeFrom")
    .addEventListener("click", PopulateSelectVolumeTo);
});
