
import React from 'react'

import TeamMember from './TeamMember'

import styles from '../../styles/team.module.scss'

import martine from '../../../public/about/martine.webp'
import liz from '../../../public/about/liz.webp'
const Team = () => {
  return (
    <section className={styles.team}>
      <h2>Our Team</h2>
      <div className={styles.cardContainer}>
        
        <TeamMember
          image={martine}
          alt="Martine Broderick"
          name="Martine"
          title="Director"
          bio="Martine began her career in the film industry in 1990 working on drama and TVC productions as an on-set P.A and Assistant Director. She spent 15 years working her way up to production management roles before she became a co-owner of Freelancers 20 years ago."
        />
        
        <TeamMember
          image={liz}
          alt="Liz Gossan"
          name="Liz"
          title="Director"
          bio="Liz joined Freelancers in July 2022 as a Director. Prior to joining, Liz worked in finance roles for several FMCG companies. She is a qualified CPA."
        />
        
      </div>
    </section>
  )
}

export default Team