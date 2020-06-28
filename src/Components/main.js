import React, { Component } from 'react';


class Main extends Component {
  constructor(props) {
    super(props)
    this.state = { 
      movie_name: "Blade Runner",
      synonyms: [],
      synonyms_count: 5,
      skip_words: [
        'in', 'on', 'of', 'where', 'when'
      ]
    }
  }

  input_focus=()=> {
    console.log('input_focus')
    // this.setState({movie_name: ""})
  }

  input_blur=()=> {
    console.log('input_blur')
    let self = this

    let encoded_name = self.state.movie_name.split(' ');
    let syns = [];

    encoded_name.forEach(word => {
      fetch("https://api.datamuse.com/words?ml="+word)
        .then(res => res.json())
        .then(
          (result) => {
            let res_words = result.slice(0, 5).map( resp => resp.word)


            syns.push(res_words);

            // console.log(syns)
            // console.log(res_words)
            // console.log(syns)

            self.setState({"synonyms": syns})


            // this.setState({
            //   isLoaded: true,
            //   items: result.items
            // });
          },
          // Note: it's important to handle errors here
          // instead of a catch() block so that we don't swallow
          // exceptions from actual bugs in components.
          (error) => {
            // this.setState({
            //   isLoaded: true,
            //   error
            // });
          }
        )
    })

    // console.log(res_words);

  }

  input_change=(e)=> {
    // console.log('input_change', e)
    this.setState({movie_name: e.target.value})
  }


  render() {
    let {synonyms, movie_name, synonyms_count} = this.state;

    let syn_list = '';

    if(synonyms.length == movie_name.split(" ").length ) {
      let built_words = []
      // console.log(synonyms)
      for (var i = 0; i <= synonyms_count - 1; i++) {
        // built_words[i] = synonyms[0][i]+" | "+synonyms[1][i];


        built_words[i] = '';
        for (var s = 0; s <= synonyms.length - 1; s++) {
          // console.log(synonyms[s][i])
          built_words[i] += synonyms[s][i]
          if(s !=  synonyms.length - 1) 
            built_words[i] += " | ";
        }

      }

      syn_list = built_words.map(word => {
        // console.log(word);
        return (
          <p>{word}</p>
        )
      })

    }


    return (
      <div className="main-wrapper">
        <h2> Movie Name </h2>
        <input type="text" 
          name="movie_name" 
          value={this.state.movie_name} 
          onFocus={this.input_focus} 
          onBlur={this.input_blur}
          onChange={e => {this.input_change(e)}}
        />

        <p className="subtitle">Play Words:</p>
        {/*<p>Knife Sprinter</p>
        <p>Sword Dasher</p>
        <p>Metal Rusher</p>
        <p>--------------</p>
      */}
        
        {syn_list}

      </div>
    )
  }
}

export default Main;