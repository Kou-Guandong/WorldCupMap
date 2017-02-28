"use strict";

d3.json("../assets/world_countries.json", draw);

function draw(geo_data) {
  
  var margin = 75,
    width = 1000 - margin,
    height = 600 - margin;
  
  var svg = d3.select("#svgWrapper").append("svg").attr("width", width + margin).attr("height", height + margin).append('g').attr('class', 'map');
  
  var years = getYears(1930, 2015, 4, [1942, 1946]);
  
  
  function plot_points(data) {
    
    var nested = d3.nest().key((d) => d['date'].getUTCFullYear()).rollup(agg_year).entries(data);
    
    var attendance_max = d3.max(nested, function (d) {
      return d.values['attendance'];
    });
    
    var radius = d3.scale.sqrt().domain([0, attendance_max]).range([0, 15]);
    
    svg.append('g').attr("class", "bubble").selectAll("circle")
      .data(nested.sort((a, b) => b.values['attendance'] - a.values['attendance']), key_func)
      .enter().append("circle").attr('cx', (d) => d.values['x'])
      .attr('cy', (d) => d.values['y'])
      .attr('r', (d) => radius(d.values['attendance']));
  
    var year_idx = 0;
  
    var year_interval = setInterval(() => {
      update(years[year_idx]);
    
      year_idx++;
    
      if (year_idx >= years.length) {
        clearInterval(year_interval);
      
        var buttons = d3.select("body").append("div").attr("class", "years_buttons").selectAll("div").data(years).enter().append("div").text(function (d) {
          return d;
        });
      
        buttons.on("click", function (d) {
          buttons.attr('class','');
          d3.select(this).attr('class', 'active');
          update(d);
        });
      }
    }, 1000);
  
    function key_func(d) {
      return d['key'];
    }
    
    function update(year) {
      var filtered = nested.filter((d) => new Date(d['key']).getUTCFullYear() === year);
      
      d3.select("h2").text("World Cup " + year);
      
      var circles = svg.selectAll('circle').data(filtered, key_func);
      
      circles.exit().remove();
      
      circles.enter().append("circle").transition().duration(500).attr('cx', function (d) {
        return d.values['x'];
      }).attr('cy', function (d) {
        return d.values['y'];
      }).attr('r', function (d) {
        return radius(d.values['attendance']);
      });
      
      var countries = filtered[0].values['teams'];
      
      function update_countries(d) {
        if (countries.indexOf(d.properties.name) !== -1) {
          return "country country-fill";
        } else {
          return 'country';
        }
      }
      
      svg.selectAll('path').transition().duration(50)
        .attr('class', update_countries)
    }
    
    function agg_year(leaves) {
      var projection = d3.geo.mercator().scale(140).translate([width / 2, height / 1.2]);
      var path = d3.geo.path().projection(projection);
      svg.selectAll('path').data(geo_data.features).enter().append('path').attr('d', path)
        .attr('class', 'country')
        .style('stroke', 'black')
        .style('stroke-width', 0.5);
      
      var total = d3.sum(leaves, function (d) {
        return d['attendance'];
      });
      
      var coords = leaves.map(function (d) {
        return projection([+d.long, +d.lat]);
      });
      
      var center_x = d3.mean(coords, function (d) {
        return d[0];
      });
      
      var center_y = d3.mean(coords, function (d) {
        return d[1];
      });
      
      var teams = d3.set();
      
      leaves.forEach(function (d) {
        teams.add(d['team1']);
        teams.add(d['team2']);
      });
      
      return {
        'attendance': total,
        'x': center_x,
        'y': center_y,
        'teams': teams.values()
      };
    }
    
  }
  
  var format = d3.time.format("%d-%m-%Y (%H:%M h)");
  
  d3.tsv("../assets/world_cup_geo.tsv", function (d) {
    d['attendance'] = +d['attendance'];
    d['date'] = format.parse(d['date']);
    return d;
  }, plot_points);
}

// separated pure functions
function getYears(start, end, step, except) {
  let years = [];
  let year = start;
  while (year <= end) {
    if (except.indexOf(year) < 0) years.push(year);
    year += step;
  }
  return years;
}